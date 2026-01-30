import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readBoard, writeBoard, getBoardPath } from '../../services/board/boardPersistence';
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
    // DEBUG: Verify if this code runs
    vscode.window.showInformationMessage('DevOps Task Editor v0.0.3 Loaded');
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
          await handleCardDeleteMessage(taskId, tempProvider, syncFilterUI);
          // Check if task still exists
          const boardAfter = await readBoard();
          if (!boardAfter.items.find(t => t.id === taskId)) {
            webviewPanel.dispose();
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
      todo: '#6b7280',
      in_progress: '#22c55e',
      needs_feedback: '#eab308',
      blocked: '#ef4444'
    };
    const statusColor = statusColors[task.status || 'todo'] || statusColors.todo;

    // Build lists for dropdowns
    const statusOptions = [
      { value: 'todo', label: 'Todo' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'needs_feedback', label: 'Needs Feedback' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'done', label: 'Done' }
    ];

    const phaseOptions = columns.map(c => ({ value: c.id, label: c.name }));

    const ownerOptionsList = ['Unassigned', 'User', 'Antigravity'];
    if (task.owner && !ownerOptionsList.includes(task.owner)) {
      ownerOptionsList.push(task.owner);
    }
    const ownerOptions = ownerOptionsList.map(o => ({ value: o, label: o }));

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

      /* Status Line */
      .status-bar {
        height: 3px;
        background: ${statusColor};
        width: 100%;
        position: fixed;
        top: 0;
        z-index: 100;
      }

      .main-content {
        padding: 24px 32px;
        margin-top: 4px; /* Space for status bar */
        max-width: 900px;
        margin-left: auto;
        margin-right: auto;
      }

      /* Card Style - Mimic Sidebar Task */
      .card-style {
        background: var(--vscode-editor-background); /* Or distinct if needed */
        border: 1px solid var(--vscode-widget-border);
        border-left: 3px solid ${statusColor};
        border-radius: 6px;
        padding: 8px 12px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }

      /* Header Section */
      .header-section {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 32px;
      }
      
      .title-container {
        flex: 1;
        display: flex;
        align-items: center;
      }

      .title-input {
        width: 100%;
        font-size: 18px;
        font-weight: 600;
        background: transparent;
        border: none;
        color: var(--vscode-editor-foreground);
        outline: none;
        font-family: inherit;
        padding: 2px 0;
      }

      .task-id-badge {
        font-size: 12px;
        font-weight: 500;
        color: var(--vscode-descriptionForeground);
        white-space: nowrap;
        opacity: 0.9;
      }

      /* Metadata Dropdowns */
      .metadata-section {
        display: flex;
        gap: 16px;
        margin-bottom: 32px;
        flex-wrap: wrap;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
        min-width: 160px;
      }

      .filter-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        margin-left: 4px;
      }

      /* Dropdown Trigger as Card */
      .dropdown-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        padding: 10px 12px;
        font-size: 13px;
        user-select: none;
      }
      .dropdown-trigger:hover {
        background: var(--vscode-list-hoverBackground);
      }
      .dropdown-trigger::after {
        content: '';
        border: 4px solid transparent;
        border-top-color: currentColor;
        margin-top: 4px; /* Move slightly down */
        opacity: 0.7;
      }

      .dropdown-menu {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: var(--vscode-dropdown-background);
        border: 1px solid var(--vscode-dropdown-border);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        margin-top: 4px;
        border-radius: 6px;
        overflow: hidden;
      }
      .custom-dropdown {
        position: relative;
      }
      .custom-dropdown.open .dropdown-menu {
        display: block;
      }
      .dropdown-item {
        padding: 8px 12px;
        cursor: pointer;
        font-size: 13px;
        color: var(--vscode-dropdown-foreground);
      }
      .dropdown-item:hover {
        background: var(--vscode-list-hoverBackground);
      }
      .dropdown-item.active {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
      }

      /* Sections */
      .section {
        margin-bottom: 32px;
      }
      .section-header {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 12px;
        margin-left: 4px;
      }

      /* Instructions Input Card */
      .instructions-container {
        padding: 0; /* Let textarea fill */
        overflow: hidden; /* For border radius */
      }
      textarea.instructions-input {
        width: 100%;
        min-height: 120px;
        background: transparent;
        color: var(--vscode-input-foreground);
        border: none;
        padding: 12px;
        font-family: var(--vscode-editor-font-family);
        font-size: 13px;
        resize: vertical;
        outline: none;
        line-height: 1.5;
        display: block;
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
    </style>`;

    const getDropdownHtml = (id: string, label: string, options: { value: string, label: string }[], current: string) => {
      const currentLabel = options.find(o => o.value === current)?.label || current;
      return `
        <div class="filter-group">
          <label class="filter-label">${label}</label>
          <div class="custom-dropdown" id="${id}-dropdown">
            <input type="hidden" id="${id}" value="${current}">
            <div class="dropdown-trigger card-style" id="${id}-trigger" tabindex="0">
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
  
  <div class="status-bar"></div>

  <div class="main-content">
    
    <!-- Header -->
    <div class="header-section">
      <div class="title-container card-style">
        <input type="text" class="title-input" id="title" value="${task.title}" placeholder="Task Title">
      </div>
      <div class="task-id-badge card-style">${task.id}</div>
    </div>

    <!-- Metadata Filters -->
    <div class="metadata-section">
      ${getDropdownHtml('status', 'Status', statusOptions, task.status || 'todo')}
      ${getDropdownHtml('column', 'Phase', phaseOptions, task.columnId || '')}
      ${getDropdownHtml('owner', 'Owner', ownerOptions, task.owner || 'Unassigned')}
    </div>

    <!-- Instructions -->
    <div class="section">
      <div class="section-header">Agent Instructions</div>
      <div class="instructions-container card-style">
        <textarea id="summary" class="instructions-input" 
          placeholder="Enter instructions...">${task.summary || ''}</textarea>
      </div>
    </div>

    <!-- Trace -->
    <div class="section">
      <div class="section-header">Decision Trace</div>
      <div class="trace-container card-style">
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
    setupDropdown('owner');

    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    });

    function collect() {
      return {
        title: document.getElementById('title').value,
        status: document.getElementById('status').value,
        columnId: document.getElementById('column').value,
        owner: document.getElementById('owner').value,
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
