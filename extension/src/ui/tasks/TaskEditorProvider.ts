import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readBoard, writeBoard, getBoardPath, getTaskBundleDir } from '../../services/board/boardPersistence';
import { boardService } from '../../services/board/boardService';
import { Task, ChecklistItem, COLUMN_FALLBACK_NAME, TaskStatus } from '../../types';
import { getFontLink, getSharedStyles, getCSPMeta } from '../shared/styles';
import { handleCardUpdateMessage, handleCardDeleteMessage } from '../../vscode/commands/sharedHandlers';
import { BoardTreeProvider } from '../board';
import { formatError } from '../../infrastructure/errors';

/**
 * Content provider for devops-task:// URIs.
 */
class TaskDocumentContentProvider implements vscode.TextDocumentContentProvider {
  public static readonly scheme = 'devops-task';
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  public update(uri: vscode.Uri) {
    this._onDidChange.fire(uri);
  }

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const taskId = uri.path.replace('/task/', '').replace('.devops-task', '');
    try {
      const board = await readBoard();
      const task = board.items.find(t => t.id === taskId);
      if (task) { return JSON.stringify(task, null, 2); }
    } catch { }
    return JSON.stringify({ id: taskId, error: 'Task not found' });
  }
}

// Helper to escape HTML characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class TaskEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'devops.taskEditor';
  private static instance: TaskEditorProvider | undefined;

  // Event emitter for global refreshes
  private static readonly _onReqRefresh = new vscode.EventEmitter<void>();
  public static readonly onReqRefresh = TaskEditorProvider._onReqRefresh.event;

  public static refreshAll() {
    this._onReqRefresh.fire();
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new TaskEditorProvider(context);
    TaskEditorProvider.instance = provider;
    const contentProvider = new TaskDocumentContentProvider();

    return vscode.Disposable.from(
      vscode.workspace.registerTextDocumentContentProvider(TaskDocumentContentProvider.scheme, contentProvider),
      vscode.window.registerCustomEditorProvider(TaskEditorProvider.viewType, provider, {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      })
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) { }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true };
    console.log('DevOps Task Editor loaded');
    const taskId = this.getTaskIdFromUri(document.uri);
    // Get the provider from global instance or context if possible
    // For now, we assume provideTextDocumentContent already handles the read
    const board = await readBoard();
    const provider = new BoardTreeProvider(() => Promise.resolve(board)); // Mock or real provider

    const updateWebview = async () => {
      const task = await this.loadTask(taskId);
      if (!task) {
        webviewPanel.webview.html = this.getErrorHtml(`Task ${taskId} not found`);
        return;
      }
      const board = await readBoard();
      webviewPanel.webview.html = this.getEditorHtml(task, board.columns, webviewPanel.webview);
    };

    // Subscribe to global refresh events
    const refreshSub = TaskEditorProvider.onReqRefresh(() => {
      console.log(`[TaskEditor] Global refresh triggered for ${taskId}`);
      updateWebview();
    });

    webviewPanel.onDidDispose(() => {
      refreshSub.dispose();
    });

    // Initial render
    await updateWebview();

    // Auto-refresh when the underlying file changes on disk
    // We watch the specific task.json file to avoid reloading on every board change
    const bundleDir = getTaskBundleDir(taskId);
    if (bundleDir) {
      const taskJsonPattern = new vscode.RelativePattern(bundleDir, 'task.json');
      const watcher = vscode.workspace.createFileSystemWatcher(taskJsonPattern);

      // Simple debounce
      let refreshTimeout: NodeJS.Timeout | undefined;
      const debouncedRefresh = () => {
        if (refreshTimeout) { clearTimeout(refreshTimeout); }
        refreshTimeout = setTimeout(() => {
          console.log(`[TaskEditor] File changed for ${taskId}, refreshing...`);
          updateWebview().catch(e => console.error('Refresh failed', e));
        }, 300);
      };

      watcher.onDidChange(debouncedRefresh);
      watcher.onDidCreate(debouncedRefresh);
      // onDidDelete -> maybe close editor or show deleted state? 
      // For now let's just let getErrorHtml handles it on next refresh attempt or keep last state.

      webviewPanel.onDidDispose(() => {
        watcher.dispose();
        if (refreshTimeout) { clearTimeout(refreshTimeout); }
      });
    }

    // Handle messages
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      // Create a dummy provider or use a real one if accessible
      const currentBoard = await readBoard();
      const tempProvider = new BoardTreeProvider(() => Promise.resolve(currentBoard));
      const syncFilterUI = () => {
        void vscode.commands.executeCommand('setContext', 'devopsFilterActive', tempProvider.hasFilter());
      };

      switch (message.type) {
        case 'update':
          await handleCardUpdateMessage({ id: taskId, ...message.data }, tempProvider, syncFilterUI);
          break;
        case 'save':
          await handleCardUpdateMessage({ id: taskId, ...message.data }, tempProvider, syncFilterUI);
          vscode.window.showInformationMessage(`✅ Saved task ${taskId}`);
          await updateWebview();
          vscode.commands.executeCommand('devops.refreshBoard');
          break;
        case 'openActions':
          // Show Quick Pick for actions
          const action = await vscode.window.showQuickPick(['Archive Task', 'Delete Task'], {
            placeHolder: 'Task Actions'
          });

          if (action === 'Archive Task') {
            await boardService.archiveTask(taskId);
            vscode.window.showInformationMessage(`Task ${taskId} archived.`);
            webviewPanel.dispose();
            vscode.commands.executeCommand('devops.refreshBoard');
          } else if (action === 'Delete Task') {
            // Confirm delete
            const confirm = await vscode.window.showWarningMessage(
              `Are you sure you want to permanently delete task ${taskId}?`,
              { modal: true },
              "Delete"
            );
            if (confirm === "Delete") {
              await handleCardDeleteMessage(taskId, tempProvider, syncFilterUI);
              webviewPanel.dispose();
            }
          }
          break;
        case 'delete':
          // Legacy handler, just in case
          break;
        case 'approveTask':
          // Move task logic
          let nextColumn = 'col-implement';
          const currentTask = (await readBoard()).items.find(t => t.id === taskId);
          const currentColumn = currentTask?.columnId;

          if (currentColumn === 'col-plan') nextColumn = 'col-implement';
          else if (currentColumn === 'col-implement') nextColumn = 'col-verify';
          else if (currentColumn === 'col-verify') nextColumn = 'col-done';
          else if (currentColumn === 'col-backlog') nextColumn = 'col-plan';

          await boardService.moveTask(taskId, nextColumn);

          // Change status to in_progress or done
          const newStatus = nextColumn === 'col-done' ? 'done' : 'in_progress';
          await boardService.updateTask(taskId, { status: newStatus as TaskStatus });

          vscode.commands.executeCommand('devops.claimTask', { taskId });

          vscode.window.showInformationMessage(`Task ${taskId} approved and moved to ${nextColumn}.`);
          await updateWebview();
          vscode.commands.executeCommand('devops.refreshBoard');
          break;
        case 'reviseTask':
          // Change status back to in_progress
          await boardService.updateTask(taskId, { status: 'in_progress' });
          vscode.commands.executeCommand('devops.claimTask', { taskId });
          vscode.window.showInformationMessage(`Task ${taskId} set to revise.`);
          await updateWebview();
          vscode.commands.executeCommand('devops.refreshBoard');
          break;

      }
    });
  }

  private getTaskIdFromUri(uri: vscode.Uri): string {
    return uri.path.replace('/task/', '').replace('.devops-task', '');
  }

  private async loadTask(taskId: string): Promise<Task | undefined> {
    const board = await readBoard();
    return board.items.find(t => t.id === taskId);
  }



  // These are now handled by sharedHandlers

  private getErrorHtml(message: string): string {
    return `<html><body><h2 style="color:red">${message}</h2></body></html>`;
  }

  private getEditorHtml(task: Task, columns: Array<{ id: string; name: string }>, webview: vscode.Webview): string {

    // Get status color for accent
    const statusColors: Record<string, string> = {
      todo: '#6b7280', // Gray
      in_progress: '#22c55e', // Green
      ready: '#3b82f6', // Blue
      needs_feedback: '#eab308', // Yellow
      blocked: '#ef4444', // Red
      done: '#3b82f6', // Blue
      archived: '#6b7280'
    };

    const currentStatus = task.status || 'todo';
    const activeStatusColor = statusColors[currentStatus] || '#6b7280';
    const cssStatusColor = activeStatusColor;

    // Status Options
    const statusOptions = [
      // Todo is default (no status), so we remove the explicit option
      { value: 'in_progress', label: 'In Progress', color: statusColors['in_progress'] },
      { value: 'needs_feedback', label: 'Needs Feedback', color: statusColors['needs_feedback'] },
      { value: 'blocked', label: 'Blocked', color: statusColors['blocked'] },
      { value: 'done', label: 'Done', color: statusColors['done'] }
    ];

    // Status Chips HTML Generator
    const getStatusChips = () => {
      return statusOptions.map(opt => {
        const isSelected = opt.value === currentStatus;
        // Styles are handled by CSS class 'status-chip' and 'active'
        const activeClass = isSelected ? 'active' : '';
        // Inject color var for active state if needed, but sticky css is better

        return `<div class="status-chip ${activeClass}" 
                     data-value="${opt.value}" 
                     data-color="${opt.color}">
                  ${opt.label}
                </div>`;
      }).join('');
    };

    // Metadata Values
    const ownerName = task.owner || 'Unassigned';
    const agentName = task.activeSession?.agent || 'None';
    const modelName = task.activeSession?.model || 'None';

    // Page-specific styles
    const pageStyles = `<style>
      /* Page-specific overrides */
      :root {
        --status-color: ${cssStatusColor};
      }
      
      * {
        box-sizing: border-box;
      }

      body {
        padding: 0; 
        margin: 0;
        font-family: var(--vscode-font-family);
        background-color: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        height: 100vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* Custom Scrollbar */
      ::-webkit-scrollbar {
        width: 10px;
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 5px;
        border: 2px solid var(--vscode-editor-background);
      }
      ::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground);
      }
      ::-webkit-scrollbar-thumb:active {
        background: var(--vscode-scrollbarSlider-activeBackground);
      }

      /* Layout Containers */
      .main-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-width: 900px;
        margin: 0 auto;
        width: 100%;
        position: relative;
      }

      .scrollable-content {
        flex: 1;
        overflow-y: auto;
        min-height: 0; /* Important for flex shrinking */
        padding: 24px 32px;
        padding-bottom: 0; 
      }



      /* Section Containers (Header, Status, To-Do) */
      .section-card {
        position: relative;
        overflow: hidden;
        border-radius: 8px;
        background: var(--vscode-editor-background); 
        border: 1px solid var(--vscode-widget-border);
        border-left: 2px solid var(--status-color);
        padding: 12px;
        padding-left: 16px;
        margin-bottom: 24px;
      }
      /* Highlight is now handled by border-left */

      /* Header Card (uses section-card) */
      .header-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      /* Status Section (uses section-card) */
      .status-section {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        border-left: none !important;
        border: none !important;
      }

      /* Section card style handles borders/padding */
      .todo-section {
        display: flex;
        flex-direction: column;
        max-height: 400px; /* Limit height */
        overflow-y: auto;  /* Scroll if needed */
      }
      
      /* ... other styles ... */
      

      .checklist-text:focus {
        border-color: var(--vscode-widget-border) !important;
        background: var(--vscode-input-background);
        box-shadow: 0 0 0 1px var(--vscode-widget-border) !important;
      }
      /* ... */

      .metadata-row {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        opacity: 0.8;
      }
      .metadata-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .metadata-dot {
        width: 3px;
        height: 3px;
        background: currentColor;
        border-radius: 50%;
        opacity: 0.5;
      }

      .header-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      /* Seamless Title Input */
      input.title-input {
        flex: 1;
        width: 100%;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        font-size: 18px;
        font-weight: 600;
        color: var(--vscode-editor-foreground);
        line-height: 1.4;
      }
      input.title-input:focus { opacity: 1; }
      input.title-input::placeholder { color: var(--vscode-editor-foreground); opacity: 0.4; }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .action-menu-btn {
        background: transparent;
        border: none;
        color: var(--vscode-foreground);
        cursor: pointer;
        padding: 4px;
        font-size: 16px;
        line-height: 1;
        border-radius: 4px;
        opacity: 0.7;
      }
      .action-menu-btn:hover {
        background: var(--vscode-toolbar-hoverBackground);
        opacity: 1;
      }


      .task-id-badge {
        font-size: 12px;
        font-weight: 500;
        color: var(--status-color);
        border: 1px solid var(--status-color) !important;
        padding: 1px 7px;
        border-radius: 10px;
        white-space: nowrap;
      }

      .status-chips-container {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 2px; /* Scrollbar space if needed */
      }
      .status-chip {
        cursor: pointer;
        padding: 4px 12px;
        font-size: 11px;
        border-radius: 4px; /* Rounded corners matching UI */
        border: 1px solid var(--vscode-widget-border);
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        opacity: 0.7;
        transition: all 0.2s ease;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .status-chip.active {
        opacity: 1;
        font-weight: 600;
        background: var(--status-color);
        color: #fff; /* Assuming dark mode usually, or we can use contrast color */
      }
      .status-chip:hover { opacity: 1; }

      /* Instructions / Checklist */
      .section-header {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .checklist-header-actions {
        display: flex;
        gap: 8px;
      }

      .icon-btn-small {
        background: transparent;
        border: none;
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
        padding: 2px;
        border-radius: 4px;
        display: flex; /* Ensure SVG is centered */
        align-items: center; /* Vertical center */
        justify-content: center; /* Horizontal center */
      }
      .icon-btn-small:hover {
        background: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
        border-color: var(--vscode-widget-border);
      }
      
      .checklist-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .checklist-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 6px;
        border-radius: 4px;
        transition: background 0.1s;
        background: var(--vscode-editor-background); /* styling for drag */
      }
      .checklist-item.dragging {
        opacity: 0.5;
        background: var(--vscode-list-dropBackground);
      }
      .checklist-item:hover {
        background: var(--vscode-toolbar-hoverBackground);
      }
      /* Make delete button always visible if that was the issue? User said checkbox/ordering. 
         But let's keep delete on hover to reduce clutter unless requested. */
      .checklist-item:hover .delete-btn {
        opacity: 1;
      }

      .drag-handle {
        cursor: grab;
        color: var(--vscode-descriptionForeground);
        opacity: 0.7; /* Increased from 0.5 and always visible */
        font-size: 14px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 20px; /* Match checkbox height roughly or ensure centering */
        width: 16px;
      }
      .drag-handle:hover { opacity: 1; }
      
      .checklist-checkbox {
         opacity: 1; /* Ensure visible */
         cursor: pointer;
      }

      .checklist-checkbox {
        margin: 0; /* reset */
        cursor: pointer;
      }
      .checklist-text {
        font-size: 13px;
        line-height: 1.5;
        flex: 1;
        outline: none;
        border: 1px solid transparent;
        min-width: 0; /* flex fix */
      }
      .checklist-text:focus {
        border-color: var(--status-color);
        background: var(--vscode-input-background);
        box-shadow: 0 0 0 1px var(--status-color);
      }
      .checklist-text.done {
        text-decoration: line-through;
        opacity: 0.6;
      }
      
      .drag-spacer {
        height: 2px;
        margin: 4px 0;
        background: var(--status-color);
        border-radius: 2px;
        opacity: 0.5;
        pointer-events: none;
      }

      .add-item-btn {
        margin-top: 8px;
        background: transparent;
        border: 1px dashed var(--vscode-widget-border);
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        font-size: 12px;
        width: 100%;
        justify-content: flex-start;
        opacity: 0.7;
        transition: all 0.2s;
      }
      .add-item-btn:hover {
        background: var(--vscode-toolbar-hoverBackground);
        border-color: var(--status-color);
        color: var(--vscode-foreground);
        opacity: 1;
      }
      
      /* Footer Actions */
      .actions-footer {
        display: flex;
        gap: 12px;
        margin-top: 16px;
      }
      .actions-footer button {
        height: 32px;
        padding: 0 16px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        border: none;
      }
      .btn-primary {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      .btn-primary:hover {
        background-color: var(--vscode-button-hoverBackground);
      }
      .btn-secondary {
        background-color: transparent;
        color: var(--vscode-button-background);
        border: 1px solid var(--vscode-button-background) !important;
      }
      .btn-secondary:hover {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      
      .delete-btn {
        opacity: 0; /* Hidden by default */
        background: transparent;
        border: none;
        color: var(--vscode-descriptionForeground); /* Subtle gray */
        cursor: pointer;
        padding: 4px; /* Slightly larger hit area */
        border-radius: 4px;
        transition: opacity 0.2s, color 0.2s, background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .delete-btn:hover {
        background: var(--vscode-toolbar-hoverBackground); 
        color: #FFFFFF; /* White on hover */
      }

      .raw-instructions-container {
        display: none; /* Toggled */
        margin-top: 8px;
      }
      textarea.instructions-input {
        width: 100%;
        min-height: 150px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-widget-border);
        padding: 8px;
        font-family: var(--vscode-editor-font-family);
        font-size: 13px;
        resize: vertical;
      }

      }
      
      .checklist-item .delete-btn {
        margin-left: auto;
      }
      
      .toggle-btn {
        background: none;
        border: none;
        color: var(--vscode-textLink-foreground);
        cursor: pointer;
        font-size: 10px;
      }
      .toggle-btn:hover { text-decoration: underline; }

      .empty-state {
        display: none; /* Hidden by default */
      }
      
      .description-input {
        width: 100%;
        min-height: 100px;
        background: transparent;
        color: var(--vscode-input-foreground);
        border: none;
        padding: 8px;
        font-family: var(--vscode-editor-font-family);
        font-size: 13px;
        resize: vertical;
        outline: none;
        display: block;
      }
      .description-input:focus {
         background: var(--vscode-input-background);
      }

      .checklist-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 4px;
        transition: background 0.1s;
        background: var(--vscode-editor-background); 
      }
      .checklist-text {
        font-size: 13px;
        line-height: 1.5;
        flex: 1;
        outline: none;
        border: 1px solid transparent;
        min-width: 0;
        padding-top: 1px; 
      }
      
      .checkbox-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Reuse other styles */
    </style>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${getCSPMeta()}
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${getFontLink(webview, this.context.extensionUri)}
  <title>${task.title}</title>
  ${getSharedStyles()}
  ${pageStyles}
</head>
<body>
  
  <div class="main-container">
    
    <!-- Scrollable Top Section -->
    <div class="scrollable-content">
      
      <!-- Header -->
      <div class="header-card section-card">
        <div class="header-top-row">
          <input type="text" class="title-input" id="title" value="${task.title}" placeholder="TASK TITLE">
          <div class="header-actions">
            <div class="task-id-badge">${task.id}</div>
            <button type="button" id="action-menu-btn" class="action-menu-btn" title="More options">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="metadata-row">
          <div class="metadata-item"><span>Owner: ${ownerName}</span></div>
          <div class="metadata-dot"></div>
          <div class="metadata-item"><span>Agent: ${agentName}</span></div>
          <div class="metadata-dot"></div>
          <div class="metadata-item"><span>Model: ${modelName}</span></div>
        </div>
        
        <!-- Status Chips (Moved Here) -->
        <div class="status-chips-container" id="status-chips" style="margin-top:8px; gap:4px;">
           ${getStatusChips()}
        </div>
      </div>

      <!-- Description Section -->
      <div class="content-section description-section section-card">
        <div class="section-header">
          <span>DESCRIPTION</span>
        </div>
        <textarea id="description" class="description-input" placeholder="Add description, instructions, or requirements here...">${escapeHtml(task.description || '')}</textarea>
      </div>

       <input type="hidden" id="status" value="${currentStatus}">
       <input type="hidden" id="column" value="${task.columnId || ''}">

      <!-- To-Do List (Checklist Mode) -->
      <div class="content-section todo-section section-card">
        <div class="section-header">
          <span>CHECKLIST</span>
          <div class="checklist-header-actions">
             <!-- Actions moved to bottom or specific items -->
          </div>
        </div>
        
        <!-- Interactive Checklist Render -->
        <div class="checklist-container" id="checklist-view">
          <!-- Populated by JS -->
        </div>

        <!-- Add Button at Bottom -->
        <button class="add-item-btn" id="add-checklist-item">
           <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right:6px">
             <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
           </svg>
           Add item
        </button>
      </div>

       <!-- Footer Actions -->
       <div class="actions-footer">
        ${currentStatus === 'needs_feedback' ? `
          <button id="approveBtn" class="btn btn-primary">Approve</button>
          <button id="reviseBtn" class="btn btn-secondary">Revise</button>
        ` : ''}
       </div>
      
    </div> <!-- End Scrollable -->

  </div>

<script>
    const vscode = acquireVsCodeApi();
    
    // --- State ---
    const statusInput = document.getElementById('status');
    const descriptionInput = document.getElementById('description');
    const checklistContainer = document.getElementById('checklist-view');
    
    // Initial Data
    const initialChecklist = ${JSON.stringify(task.checklist || [])};

    // --- Status Chips ---
    function updateTheme(color) {
      document.documentElement.style.setProperty('--status-color', color);
    }

    document.getElementById('status-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.status-chip');
      if (!chip) return;
      
      const val = chip.dataset.value;
      const color = chip.dataset.color;
      
      statusInput.value = val;
      
      document.querySelectorAll('.status-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      updateTheme(color);
      triggerUpdate();
    });

    // --- Checklist Manager ---
    class ChecklistManager {
        constructor(container, items) {
            this.container = container;
            this.items = items ? JSON.parse(JSON.stringify(items)) : []; // Deep copy
            this.dragSrcEl = null;
            this.dragSpacer = null;
            
            // Ensure ids
            this.items.forEach(item => {
                if (!item.id) item.id = this.generateId();
                if (item.indent === undefined) item.indent = 0;
            });
            
            this.render();
            
            // Listen for external updates
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'updateChecklist') {
                     this.items = message.checklist || [];
                     this.render();
                } else if (message.description !== undefined) {
                     descriptionInput.value = message.description;
                }
            });
        }

        generateId() {
            return 'item-' + Math.random().toString(36).substr(2, 9);
        }

        save() {
            triggerUpdate();
        }

        render() {
            this.container.innerHTML = '';
            
            this.items.forEach((item, index) => {
                const el = this.createItemElement(item, index);
                this.container.appendChild(el);
            });
        }

        createItemElement(item, index) {
            const div = document.createElement('div');
            div.className = 'checklist-item';
            div.draggable = true;
            div.dataset.index = index;
            div.dataset.id = item.id;
            
            // Indentation
            const marginLeft = (item.indent || 0) * 20;
            div.style.marginLeft = \`\${marginLeft}px\`;

            // HTML Structure
            div.innerHTML = \`
                <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                <div class="checkbox-wrapper">
                    <input type="checkbox" class="checklist-checkbox" \${item.done ? 'checked' : ''}>
                </div>
                <div class="checklist-text \${item.done ? 'done' : ''}" contenteditable="true" placeholder="Task...">\${item.text}</div>
                <button class="delete-btn" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
            \`;

            // Event Listeners
            const checkbox = div.querySelector('.checklist-checkbox');
            checkbox.addEventListener('change', (e) => {
                item.done = e.target.checked;
                const textDiv = div.querySelector('.checklist-text');
                if (item.done) textDiv.classList.add('done');
                else textDiv.classList.remove('done');
                this.save();
            });

            const textDiv = div.querySelector('.checklist-text');
            textDiv.addEventListener('input', (e) => {
                item.text = e.target.innerText;
                this.save(); 
            });
            
            // Key navigation
            textDiv.addEventListener('keydown', (e) => this.handleKeydown(e, item, index));

            const deleteBtn = div.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                this.deleteItem(index);
            });

            // Drag Events
            div.addEventListener('dragstart', (e) => this.handleDragStart(e, div, index));
            div.addEventListener('dragend', (e) => this.handleDragEnd(e, div));
            div.addEventListener('dragover', (e) => this.handleDragOver(e));
            div.addEventListener('drop', (e) => this.handleDrop(e, index));

            return div;
        }

        handleKeydown(e, item, index) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Add new item below
                const nextIndex = index + 1;
                this.addItem(nextIndex, '', item.indent);
                this.focusItem(nextIndex);
            } else if (e.key === 'Backspace' && item.text === '') {
                e.preventDefault();
                // Delete empty item and focus previous
                if (this.items.length > 0) {
                    this.deleteItem(index);
                    if (index > 0) this.focusItem(index - 1);
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    // Outdent
                    if (item.indent > 0) {
                        item.indent--;
                        this.render(); 
                        this.save();
                        this.focusItem(index);
                    }
                } else {
                    // Indent
                    item.indent = (item.indent || 0) + 1;
                    this.render();
                    this.save();
                    this.focusItem(index);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.focusItem(index - 1);
            } else if (e.key === 'ArrowDown') {
                 e.preventDefault();
                 this.focusItem(index + 1);
            }
        }

        addItem(index, text = '', indent = 0) {
            this.items.splice(index, 0, {
                id: this.generateId(),
                text: text,
                done: false,
                indent: indent
            });
            this.render();
            this.save();
        }

        deleteItem(index) {
            if (index >= 0 && index < this.items.length) {
                this.items.splice(index, 1);
                this.render();
                this.save();
            }
        }

        focusItem(index) {
            setTimeout(() => {
                const el = this.container.querySelector(\`.checklist-item[data-index="\${index}"] .checklist-text\`);
                if (el) {
                    el.focus();
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }, 0);
        }

        // --- Drag and Drop ---
        handleDragStart(e, el, index) {
            this.dragSrcEl = el;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            el.classList.add('dragging');
        }

        handleDragEnd(e, el) {
            el.classList.remove('dragging');
            if (this.dragSpacer) {
                this.dragSpacer.remove();
                this.dragSpacer = null;
            }
        }
        
        handleDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(e.clientY);
            
            if (!this.dragSpacer) {
                this.dragSpacer = document.createElement('div');
                this.dragSpacer.className = 'drag-spacer';
            }
            
            if (afterElement) {
                this.container.insertBefore(this.dragSpacer, afterElement);
            } else {
                this.container.appendChild(this.dragSpacer);
            }
        }
        
        getDragAfterElement(y) {
             const draggableElements = [...this.container.querySelectorAll('.checklist-item:not(.dragging)')];
             return draggableElements.reduce((closest, child) => {
                 const box = child.getBoundingClientRect();
                 const offset = y - box.top - box.height / 2;
                 if (offset < 0 && offset > closest.offset) {
                     return { offset: offset, element: child };
                 } else {
                     return closest;
                 }
             }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        handleDrop(e, targetIndex) {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            
            const siblings = [...this.container.children];
            let toIndex = 0;
            let count = 0;
            for(let i=0; i<siblings.length; i++) {
                if (siblings[i] === this.dragSpacer) {
                     toIndex = count;
                     break;
                }
                if (siblings[i] !== this.dragSrcEl && siblings[i].classList.contains('checklist-item')) {
                    count++;
                }
            }
            
            if (fromIndex !== toIndex) {
                const item = this.items.splice(fromIndex, 1)[0];
                this.items.splice(toIndex, 0, item);
                this.render();
                this.save();
            }
            
            if (this.dragSpacer) this.dragSpacer.remove();
            this.dragSpacer = null;
        }
    }

    // --- Init ---
    const checklistManager = new ChecklistManager(checklistContainer, initialChecklist);

    // Add New Item Button
    document.getElementById('add-checklist-item').addEventListener('click', () => {
        checklistManager.addItem(checklistManager.items.length);
        checklistManager.focusItem(checklistManager.items.length - 1);
    });

    // --- Collection & Updates ---

    function collect() {
      // Assuming descriptionInput is defined elsewhere or needs to be defined here
      const descriptionInput = document.getElementById('description'); // Assuming 'description' is the ID for the textarea
      const statusInput = document.getElementById('status'); // Assuming 'status' is the ID for the status input
      const columnInput = document.getElementById('column'); // Assuming 'column' is the ID for the column input

      return {
        title: document.getElementById('title').value,
        status: statusInput.value,
        columnId: columnInput.value,
        description: descriptionInput.value,
        checklist: checklistManager.items // Fixed missing getAll() by directly using items
      };
    }

    function triggerUpdate() {
      vscode.postMessage({ type: 'update', data: collect() });
    }

    var timeout;
    document.getElementById('title').addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(triggerUpdate, 1000);
    });
    
    // Description Auto-save
    descriptionInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(triggerUpdate, 1000);
    });

    document.getElementById('action-menu-btn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openActions' });
    });

    document.getElementById('approveBtn')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'approveTask' });
    });

    document.getElementById('reviseBtn')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'reviseTask' });
    });
  </script>
</body>
</html>`;
  }


}
