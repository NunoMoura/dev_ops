import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readBoard, writeBoard, getBoardPath } from '../../services/board/boardPersistence';
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
        case 'delete':
          // Prompt for Archive vs Delete
          const selection = await vscode.window.showInformationMessage(
            "Do you want to Archive this task (keep record) or Delete it permanently?",
            { modal: true },
            "Archive",
            "Delete"
          );

          if (selection === "Archive") {
            await boardService.archiveTask(taskId);
            vscode.window.showInformationMessage(`Task ${taskId} archived.`);
            webviewPanel.dispose();
          } else if (selection === "Delete") {
            await handleCardDeleteMessage(taskId, tempProvider, syncFilterUI);
            // Check if task still exists
            const boardAfter = await readBoard();
            if (!boardAfter.items.find(t => t.id === taskId)) {
              webviewPanel.dispose();
            }
          }
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
      { value: 'todo', label: 'Todo', color: statusColors['todo'] },
      { value: 'in_progress', label: 'In Progress', color: statusColors['in_progress'] },
      { value: 'needs_feedback', label: 'Needs Feedback', color: statusColors['needs_feedback'] },
      { value: 'blocked', label: 'Blocked', color: statusColors['blocked'] },
      { value: 'done', label: 'Done', color: statusColors['done'] }
    ];

    // Status Chips HTML Generator
    const getStatusChips = () => {
      return statusOptions.map(opt => {
        const isSelected = opt.value === currentStatus;
        // Default style
        let style = 'color: var(--vscode-descriptionForeground); border-bottom: 2px solid transparent;';
        // Active style
        if (isSelected) {
          style = `color: var(--vscode-foreground); border-bottom: 2px solid ${opt.color}; font-weight: 600;`;
        }

        return `<div class="status-chip" 
                     data-value="${opt.value}" 
                     data-color="${opt.color}"
                     style="${style}">
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
      body {
        padding: 0; 
        margin: 0;
        font-family: var(--vscode-font-family);
        background-color: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        overflow-y: overlay;
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

      .main-content {
        padding: 24px 32px;
        max-width: 900px;
        margin-left: auto;
        margin-right: auto;
      }

      /* Unified Header Card */
      .header-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
        padding-left: 12px;
        border-left: 3px solid ${cssStatusColor}; /* Status Color Border */
        border-radius: 6px;
      }

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
        
        font-size: 16px;
        font-weight: 600;
        color: var(--vscode-editor-foreground);
        line-height: 1.4;
      }
      input.title-input:focus {
        opacity: 1;
      }
      input.title-input::placeholder {
        color: var(--vscode-editor-foreground);
        opacity: 0.4;
      }

      .task-id-badge {
        font-size: 12px;
        font-weight: 500;
        color: ${cssStatusColor};
        background: transparent !important;
        border: 1px solid ${cssStatusColor} !important;
        padding: 1px 7px;
        border-radius: 10px;
        white-space: nowrap;
        flex-shrink: 0;
        align-self: flex-start;
      }

      /* Status Chips Row */
      .status-chips-container {
        display: flex;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      .status-chip {
        cursor: pointer;
        padding: 4px 0;
        font-size: 12px;
        user-select: none;
        transition: all 0.2s ease;
      }
      .status-chip:hover {
        opacity: 0.8;
      }

      /* Separator */
      .header-separator {
        height: 1px;
        background-color: ${cssStatusColor}; /* Status Color Separator */
        margin-bottom: 32px;
        opacity: 0.3;
        width: 100%;
      }

      /* Standard Content Sections (Instructions, Trace) */
      .content-section {
        margin-bottom: 32px;
        padding-left: 12px;
        border-left: 3px solid ${cssStatusColor}; /* Status Color Border */
        border-radius: 6px;
      }
      
      .section-header {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 12px;
      }

      /* Instructions Input */
      .instructions-container {
        padding: 0;
      }
      textarea.instructions-input {
        width: 100%;
        min-height: 120px;
        background: transparent;
        color: var(--vscode-input-foreground);
        border: 1px solid transparent; /* Invisible border unless focused */
        padding: 0;
        font-family: var(--vscode-editor-font-family);
        font-size: 13px;
        resize: vertical;
        outline: none;
        line-height: 1.5;
        display: block;
      }
      textarea.instructions-input:focus {
        background: var(--vscode-input-background);
        padding: 8px;
        border-color: var(--vscode-focusBorder);
        border-radius: 4px;
      }

      /* Trace Card */
      .trace-container {
        min-height: 100px;
      }
      .trace-content {
        font-size: 13px;
        line-height: 1.5;
        color: var(--vscode-editor-foreground);
      }
      .trace-item {
        margin-bottom: 16px;
        padding-left: 12px;
        border-left: 2px solid var(--vscode-panel-border);
      }
      .trace-date {
        font-size: 10px;
        opacity: 0.6;
        margin-bottom: 4px;
      }

      /* Footer */
      .actions-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 24px;
        margin-top: 48px;
      }
      .btn {
        padding: 6px 14px;
        border: 1px solid transparent; 
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      .btn-primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: 1px solid var(--vscode-button-background);
      }
      .btn-primary:hover {
        background: var(--vscode-button-hoverBackground);
      }
      /* Modified Delete Button */
      .btn-danger {
        background: transparent;
        border: 1px solid #ef4444; 
        color: #ef4444;
      }
      .btn-danger:hover {
        background: #ef4444; 
        color: #ffffff;
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
  
  <div class="main-content">
    
    <!-- Unified Header Card (Status Border) -->
    <div class="header-card">
      
      <div class="header-top-row">
        <input type="text" class="title-input" id="title" value="${task.title}" placeholder="TASK TITLE">
        <div class="task-id-badge">${task.id}</div>
      </div>

      <!-- Metadata Row (Owner • Agent • Model) -->
      <div class="metadata-row">
        <div class="metadata-item">
          <span>Owner: ${ownerName}</span>
        </div>
        <div class="metadata-dot"></div>
        <div class="metadata-item">
          <span>Agent: ${agentName}</span>
        </div>
        <div class="metadata-dot"></div>
        <div class="metadata-item">
          <span>Model: ${modelName}</span>
        </div>
      </div>
    </div>

    <!-- Top Status Colored Separator -->
    <div class="header-separator"></div>

    <!-- Status Section (Renamed from Phase & Status) -->
    <div class="content-section">
      <div class="section-header">Status</div>
      <div class="status-chips-container" id="status-chips">
        ${getStatusChips()}
      </div>
      <input type="hidden" id="status" value="${currentStatus}">
    </div>

    <!-- Hidden column input to maintain value if needed or we could expose it separately if requested, but request said 'Phase & Status' renamed to 'Status' and implies simplified -->
    <!-- We keep the value in hidden input so it persists if we save -->
    <input type="hidden" id="column" value="${task.columnId || ''}">

    <!-- Agent Instructions (Status Border) -->
    <div class="content-section">
      <div class="section-header">Agent Instructions</div>
      <div class="instructions-container">
        <textarea id="summary" class="instructions-input" 
          placeholder="Enter instructions (Markdown supported)...">${task.summary || ''}</textarea>
      </div>
    </div>

    <!-- Decision Trace (Status Border) -->
    <div class="content-section">
      <div class="section-header">Decision Trace</div>
      <div class="trace-container">
        <div class="trace-content">
          ${parsedTrace || '<div style="font-style:italic; opacity:0.6;">No activity recorded yet.</div>'}
        </div>
      </div>
    </div>

    <!-- Bottom Status Colored Separator -->
    <div class="header-separator"></div>

    <!-- Footer -->
    <div class="actions-footer">
      ${task.columnId === 'col-plan' ? `<button id="approvePlanBtn" class="btn btn-primary" style="background: #22c55e; border-color: #22c55e;">Approve Plan & Start Implement</button>` : ''}
      <button id="saveBtn" class="btn btn-primary">Save Changes</button>
      <button id="deleteBtn" class="btn btn-danger">Delete Task</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    // Status Chip Logic
    const statusInput = document.getElementById('status');
    const chipsContainer = document.getElementById('status-chips');
    
    chipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.status-chip');
      if (!chip) return;
      
      const val = chip.dataset.value;
      const color = chip.dataset.color;
      
      // Update Input
      statusInput.value = val;
      
      // Update UI (Optimistic)
      document.querySelectorAll('.status-chip').forEach(c => {
        c.style.fontWeight = 'normal';
        c.style.borderBottomColor = 'transparent';
        c.style.color = 'var(--vscode-descriptionForeground)';
      });
      
      chip.style.fontWeight = '600';
      chip.style.borderBottomColor = color;
      chip.style.color = 'var(--vscode-foreground)';
      
      // Trigger update
      triggerUpdate();
    });

    function collect() {
      return {
        title: document.getElementById('title').value,
        status: statusInput.value,
        columnId: document.getElementById('column').value,
        summary: document.getElementById('summary').value
      };
    }

    function triggerUpdate() {
      vscode.postMessage({ type: 'update', data: collect() });
    }

    let timeout;
    ['title', 'summary'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(triggerUpdate, 1000);
      });
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'save', data: collect() });
    });
    
    document.getElementById('deleteBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'delete' });
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

    const lines = md.split('\n');
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
