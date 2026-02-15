import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readBoard, writeBoard, getBoardPath } from '../../services/board/boardPersistence';
import { boardService } from '../../services/board/boardService';
import { Task, ChecklistItem, COLUMN_FALLBACK_NAME, TaskStatus, ChatMessage } from '../../types';
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

export class TaskEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'devops.taskEditor';
  private static instance: TaskEditorProvider | undefined;

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
      const traceContent = await this.readTraceFile(taskId);
      webviewPanel.webview.html = this.getEditorHtml(task, board.columns, traceContent, webviewPanel.webview);
    };

    // Initial render
    await updateWebview();

    // Watch for trace file changes
    const tracePath = await this.getTraceFilePath(taskId);
    if (tracePath) {
      const watcher = vscode.workspace.createFileSystemWatcher(tracePath);
      const changeListener = watcher.onDidChange(() => updateWebview());
      webviewPanel.onDidDispose(() => {
        changeListener.dispose();
        watcher.dispose();
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
        case 'approvePlan':
          // 1. Move to Implement
          await boardService.moveTask(taskId, 'col-implement');

          // 2. Start Agent Session
          // await vscode.commands.executeCommand('devops.startAgentSession', undefined, { taskId, phase: 'Implement' });
          // Actually, let's just show a message or let the user know, because startAgentSession might be async or complex here.
          // Better: We trigger the command.
          vscode.commands.executeCommand('devops.startAgentSession', undefined, { taskId, phase: 'Implement' });

          vscode.window.showInformationMessage(`Plan Approved. Task ${taskId} moved to Implement phase.`);
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

  private async getTraceFilePath(taskId: string): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) { return undefined; }
    // Assuming single root for now or first root containing .dev_ops
    const root = workspaceFolders[0].uri.fsPath; // Simplification, robust logic is in boardStore
    return path.join(root, '.dev_ops', 'tasks', taskId, 'trace.md');
  }

  private async readTraceFile(taskId: string): Promise<string> {
    const tracePath = await this.getTraceFilePath(taskId);
    if (tracePath && fs.existsSync(tracePath)) {
      return fs.readFileSync(tracePath, 'utf8');
    }
    return '';
  }

  // These are now handled by sharedHandlers

  private getErrorHtml(message: string): string {
    return `<html><body><h2 style="color:red">${message}</h2></body></html>`;
  }

  private getEditorHtml(task: Task, columns: Array<{ id: string; name: string }>, traceMarkdown: string, webview: vscode.Webview): string {
    // Simple Markdown parsing for Trace
    const parsedTrace = this.parseTraceMarkdown(traceMarkdown);

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
      
      .todo-section {
        /* border-left and radius handled by section-card */
        padding-left: 12px;
        margin-bottom: 24px;
      }
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
    
    <!-- Scrollable Top Section (Header, Status, Instructions, Trace? No trace in new design? Trace is good.) -->
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

        <!-- Raw Editor (Hidden by default, removed button to toggle it for now per request) -->
        <div class="raw-instructions-container" id="raw-editor-container">
           <textarea id="summary" class="instructions-input" style="display:none"
            placeholder="- [ ] Add items here...">${task.summary || ''}</textarea>
        </div>
      </div>

      <!-- Trace (Optional, keeping it as it was useful) -->
      ${traceMarkdown ? `
      <div class="content-section">
        <div class="section-header">Decision Trace</div>
         <div class="trace-content">${parsedTrace}</div>
      </div>` : ''}

       <!-- Footer Actions -->
      <div class="actions-footer">
        ${task.columnId === 'col-plan' ? `<button id="approvePlanBtn" class="btn btn-primary" style="background-color: #D6336C; border: none;">Approve Implementation Plan</button>` : ''}
      </div>
      
    </div> <!-- End Scrollable -->

  </div>

<script>
    const vscode = acquireVsCodeApi();
    console.log('[DevOps Task Editor] Script Loaded - v0.0.4-ChecklistManager');
    
    // --- State ---
    const statusInput = document.getElementById('status');
    const summaryInput = document.getElementById('summary'); // Hidden raw storage
    const checklistContainer = document.getElementById('checklist-view');
    const rawEditorContainer = document.getElementById('raw-editor-container');
    // const toggleEditBtn = document.getElementById('toggle-edit-mode'); // Removed for now

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
        constructor(container, storageInput) {
            this.container = container;
            this.storageInput = storageInput;
            this.items = []; // { id, text, checked, indent }
            this.dragSrcEl = null;
            this.dragSpacer = null;
            
            // Initial Parse
            this.parse(this.storageInput.value);
            this.render();
            
            // Listen for external updates (if any)
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'updateSummary') {
                     if (message.summary !== this.serialize()) {
                         this.parse(message.summary);
                         this.render();
                     }
                }
            });
        }

        generateId() {
            return 'item-' + Math.random().toString(36).substr(2, 9);
        }

        parse(markdown) {
            this.items = [];
            if (!markdown) markdown = '';
            const lines = markdown.split('\\n');
            lines.forEach(line => {
                // We want to preserve empty lines or treat them?
                // For a task list, usually we filter empty.
                const trimmed = line.trim();
                if (!trimmed) {
                    // Start fresh group? Or just ignore.
                    // Let's ignore empty lines to prevent "ghost" items.
                    return; 
                }
                
                const match = line.match(/^(\s*)- \[(x| )\] (.*)$/);
                if (match) {
                    const indentRaw = match[1] || '';
                    const isChecked = match[2] === 'x';
                    const text = match[3];
                    const indentLevel = Math.floor(indentRaw.replace(/\\t/g, '  ').length / 2);
                    
                    this.items.push({
                        id: this.generateId(),
                        type: 'task',
                        text: text,
                        checked: isChecked,
                        indent: indentLevel
                    });
                } else {
                    // Plain text line
                    this.items.push({
                        id: this.generateId(),
                        type: 'text',
                        text: line,
                        checked: false,
                        indent: 0
                    });
                }
            });
            
            // Ensure at least one item if empty
            if (this.items.length === 0) {
                this.addItem(0, '');
            }
        }

        serialize() {
            return this.items.map(item => {
                if (item.type === 'task') {
                    const indent = '  '.repeat(item.indent);
                    const mark = item.checked ? '[x]' : '[ ]';
                    return \`\${indent}- \${mark} \${item.text}\`;
                } else {
                    return item.text;
                }
            }).join('\\n');
        }

        save() {
            const md = this.serialize();
            if (this.storageInput.value !== md) {
                this.storageInput.value = md;
                triggerUpdate();
            }
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
            const marginLeft = item.indent * 20;
            div.style.marginLeft = \`\${marginLeft}px\`;

            if (item.type === 'task') {
                div.innerHTML = \`
                    <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                    <div class="checkbox-wrapper">
                        <input type="checkbox" class="checklist-checkbox" \${item.checked ? 'checked' : ''}>
                    </div>
                    <div class="checklist-text \${item.checked ? 'done' : ''}" contenteditable="true" placeholder="Task...">\${item.text}</div>
                    <button class="delete-btn" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                \`;
            } else {
                div.innerHTML = \`
                   <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                   <div style="width: 20px;"></div> <!-- Spacer -->
                   <div class="checklist-text" contenteditable="true">\${item.text}</div>
                   <button class="delete-btn" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                \`;
            }

            // Event Listeners
            const checkbox = div.querySelector('.checklist-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    item.checked = e.target.checked;
                    const textDiv = div.querySelector('.checklist-text');
                    if (item.checked) textDiv.classList.add('done');
                    else textDiv.classList.remove('done');
                    this.save();
                });
            }

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
                this.render();
                this.focusItem(nextIndex);
            } else if (e.key === 'Backspace' && item.text === '') {
                e.preventDefault();
                // Delete empty item and focus previous
                if (this.items.length > 1) {
                    this.deleteItem(index);
                    this.focusItem(index - 1);
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    // Outdent
                    if (item.indent > 0) {
                        item.indent--;
                        this.render(); // Re-render to update margin
                        this.save();
                        this.focusItem(index);
                    }
                } else {
                    // Indent
                    item.indent++;
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
                type: 'task',
                text: text,
                checked: false,
                indent: indent
            });
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
            
            // Logic based on spacer
            const siblings = [...this.container.children];
            const spacerIdx = siblings.indexOf(this.dragSpacer);
            
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
    const checklistManager = new ChecklistManager(checklistContainer, summaryInput);

    // Add New Item Button
    document.getElementById('add-checklist-item').addEventListener('click', () => {
        checklistManager.addItem(checklistManager.items.length);
        checklistManager.render();
        checklistManager.focusItem(checklistManager.items.length - 1);
    });

    // --- Collection & Updates ---

    function collect() {
      return {
        title: document.getElementById('title').value,
        status: statusInput.value,
        columnId: document.getElementById('column').value,
        summary: summaryInput.value
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

    document.getElementById('action-menu-btn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openActions' });
    });

    document.getElementById('approvePlanBtn')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'approvePlan' });
    });
  </script>
</body>
</html>`;
  }

  private parseTraceMarkdown(md: string): string {
    if (!md) { return ''; }

    // Simple parser: Split by double newline or header
    // Ideally we want to identify "blocks"
    // Heuristic: ## Headers start new items. Bullet points in between.

    const lines = md.split('\\n');
    let html = '';
    let inItem = false;

    lines.forEach(line => {
      if (line.startsWith('# ')) {
        // Main Header - ignore or special style
      } else if (line.startsWith('> Created:')) {
        html += `<div class="trace-date">${line.replace('> Created:', '').trim()}</div>`;
      } else if (line.startsWith('## ') || line.startsWith('### ')) {
        if (inItem) { html += '</div></div>'; }
        html += `<div class="trace-item"><div class="trace-content"><h3>${line.replace(/#+\s/, '')}</h3>`;
        inItem = true;
      } else if (line.trim().startsWith('- ')) {
        if (!inItem) {
          // Orphan bullets
          html += `<div class="trace-item"><div class="trace-content">`;
          inItem = true;
        }
        html += `<li>${line.replace('- ', '')}</li>`;
      } else {
        if (inItem && line.trim()) { html += `<p>${line}</p>`; }
      }
    });

    if (inItem) { html += '</div></div>'; }
    return html;
  }
}
