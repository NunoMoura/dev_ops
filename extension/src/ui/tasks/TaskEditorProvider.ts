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
      webviewPanel.webview.html = this.getEditorHtml(task, board.columns, traceContent);
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

  private getEditorHtml(task: Task, columns: Array<{ id: string; name: string }>, traceMarkdown: string): string {
    const statusLabel = {
      todo: 'Todo',
      in_progress: 'In Progress',
      needs_feedback: 'Needs Feedback',
      blocked: 'Blocked',
      done: 'Done',
      archived: 'Archived'
    }[task.status || 'todo'] || task.status;

    // Simple Markdown parsing for Trace
    const parsedTrace = this.parseTraceMarkdown(traceMarkdown);

    // Get status color for accent
    const statusColors: Record<string, string> = {
      todo: '#6b7280', // Gray
      in_progress: '#3b82f6', // Blue (Standard VSCode Info) or Green depending on pref. Using Blue for active.
      // Wait, styles.ts has: READY: #3b82f6, AGENT_ACTIVE: #22c55e. 
      // Let's align with the standard typically used. 
      // User said "left highlight with the color dependent on the status".
      // Let's use the map:
      ready: '#3b82f6',
      needs_feedback: '#eab308',
      blocked: '#ef4444',
      done: '#3b82f6'
    };
    // Ensure we handle 'in_progress' and common ones
    const activeStatusColor = (task.status === 'in_progress') ? '#22c55e' : (statusColors[task.status || 'todo'] || '#6b7280');

    // Status color variable for CSS
    const cssStatusColor = activeStatusColor;

    // Build lists for dropdowns
    const statusOptions = [
      { value: 'todo', label: 'Todo' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'needs_feedback', label: 'Needs Feedback' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'done', label: 'Done' }
    ];

    const phaseOptions = columns.map(c => ({ value: c.id, label: c.name }));

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
        margin-bottom: 12px;
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

      /* Header Controls Row (Metadata) */
      .header-controls {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        font-size: 12px;
      }

      /* Minimal Dropdowns in Header */
      .header-dropdown .dropdown-trigger {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        color: var(--vscode-descriptionForeground);
        user-select: none;
        padding: 4px 0;
      }
      .header-dropdown .dropdown-trigger:hover {
        color: var(--vscode-textLink-foreground);
      }
      .header-dropdown .dropdown-trigger span {
        font-weight: 500;
      }
      .header-dropdown .dropdown-trigger::after {
        content: '';
        border: 4px solid transparent;
        border-top-color: currentColor;
        margin-top: 2px;
        opacity: 0.7;
      }

      .dropdown-menu {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        min-width: 150px;
        background: var(--vscode-dropdown-background);
        border: 1px solid var(--vscode-dropdown-border);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        margin-top: 4px;
        border-radius: 4px;
        overflow: hidden;
      }
      .custom-dropdown {
        position: relative;
      }
      .custom-dropdown.open .dropdown-menu {
        display: block;
      }
      .dropdown-item {
        padding: 6px 12px;
        cursor: pointer;
        font-size: 12px;
        color: var(--vscode-dropdown-foreground);
      }
      .dropdown-item:hover {
        background: var(--vscode-list-hoverBackground);
      }
      .dropdown-item.active {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
      }

      /* Separator */
      .header-separator {
        height: 1px;
        background-color: ${cssStatusColor}; /* Status Color Separator */
        margin-bottom: 32px;
        opacity: 0.5;
        width: 100%;
      }

      /* Standard Content Sections (Instructions, Trace) */
      .content-section {
        margin-bottom: 32px;
        padding-left: 12px;
        border-left: 3px solid var(--vscode-panel-border); /* Neutral Grey Border */
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
        border-top: 1px solid var(--vscode-panel-border);
        padding-top: 24px;
        margin-top: 48px;
      }
      .btn {
        padding: 6px 14px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
        font-weight: 500;
      }
      .btn-primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      .btn-danger {
        background: var(--vscode-errorForeground);
        color: var(--vscode-button-foreground);
      }
      
      /* Vertical Divider for Header Controls */
      .v-divider {
        width: 1px;
        height: 12px;
        background-color: var(--vscode-panel-border);
      }
    </style>`;

    const getHeaderDropdown = (id: string, options: { value: string, label: string }[], current: string) => {
      const currentLabel = options.find(o => o.value === current)?.label || current;
      return `
        <div class="custom-dropdown header-dropdown" id="${id}-dropdown">
          <input type="hidden" id="${id}" value="${current}">
          <div class="dropdown-trigger" id="${id}-trigger" tabindex="0">
            <span id="${id}-label">${currentLabel}</span>
          </div>
          <div class="dropdown-menu">
            ${options.map(o => `
              <div class="dropdown-item ${o.value === current ? 'active' : ''}" data-value="${o.value}">
                ${o.label}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${getCSPMeta()}
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${getFontLink()}
  <title>${task.title}</title>
  ${getSharedStyles()}
  ${pageStyles}
</head>
<body>
  
  <div class="main-content">
    
    <!-- Unified Header Card (Status Border) -->
    <div class="header-card">
      
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

      <div class="header-top-row">
        <input type="text" class="title-input" id="title" value="${task.title}" placeholder="TASK TITLE">
        <div class="task-id-badge">${task.id}</div>
      </div>
      
      <div class="header-controls">
        ${getHeaderDropdown('status', statusOptions, task.status || 'todo')}
        <div class="v-divider"></div>
        ${getHeaderDropdown('column', phaseOptions, task.columnId || '')}
      </div>
    </div>

    <!-- Status Colored Separator -->
    <div class="header-separator"></div>

    <!-- Instructions (Neutral Border) -->
    <div class="content-section">
      <div class="section-header">Agent Instructions</div>
      <div class="instructions-container">
        <textarea id="summary" class="instructions-input" 
          placeholder="Enter instructions (Markdown supported)...">${task.summary || ''}</textarea>
      </div>
    </div>

    <!-- Trace (Neutral Border) -->
    <div class="content-section">
      <div class="section-header">Decision Trace</div>
      <div class="trace-container">
        <div class="trace-content">
          ${parsedTrace || '<div style="font-style:italic; opacity:0.6;">No activity recorded yet.</div>'}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="actions-footer">
      <button id="saveBtn" class="btn btn-primary">Save Changes</button>
      <button id="deleteBtn" class="btn btn-danger">Delete Task</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function setupDropdown(id) {
      const container = document.getElementById(id + '-dropdown');
      const trigger = document.getElementById(id + '-trigger');
      const input = document.getElementById(id);
      const label = document.getElementById(id + '-label');
      const items = container.querySelectorAll('.dropdown-item');

      trigger.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-dropdown').forEach(d => {
          if (d !== container) d.classList.remove('open');
        });
        container.classList.toggle('open');
        e.stopPropagation();
      });

      items.forEach(item => {
        item.addEventListener('click', (e) => {
          const value = item.dataset.value;
          input.value = value;
          label.innerText = item.innerText;
          items.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          container.classList.remove('open');
          triggerUpdate();
          e.stopPropagation();
        });
      });
    }

    setupDropdown('status');
    setupDropdown('column');
    // Owner is now read-only metadata

    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    });

    function collect() {
      return {
        title: document.getElementById('title').value,
        status: document.getElementById('status').value,
        columnId: document.getElementById('column').value,
        // owner is read-only
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
        html += `<div class="trace-date">\${line.replace('> Created:', '').trim()}</div>`;
      } else if (line.startsWith('## ') || line.startsWith('### ')) {
        if (inItem) { html += '</div></div>'; }
        html += `<div class="trace-item"><div class="trace-content"><h3>\${line.replace(/#+\\s/, '')}</h3>`;
        inItem = true;
      } else if (line.trim().startsWith('- ')) {
        if (!inItem) {
          // Orphan bullets
          html += `<div class="trace-item"><div class="trace-content">`;
          inItem = true;
        }
        html += `<li>\${line.replace('- ', '')}</li>`;
      } else {
        if (inItem && line.trim()) { html += `<p>\${line}</p>`; }
      }
    });

    if (inItem) { html += '</div></div>'; }
    return html;
  }
}
