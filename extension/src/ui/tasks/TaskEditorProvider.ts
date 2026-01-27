import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readBoard, writeBoard, getBoardPath } from '../../services/board/boardPersistence';
import { Task, ChecklistItem, COLUMN_FALLBACK_NAME, TaskStatus } from '../../common';
import { getFontLink, getSharedStyles, getCSPMeta } from '../shared/styles';
import { handleCardUpdateMessage, handleCardDeleteMessage } from '../../vscode/commands/sharedHandlers';
import { BoardTreeProvider } from '../board';

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
    return path.join(root, '.dev_ops', 'activity', `${taskId}.md`);
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

    const currentColumn = columns.find(c => c.id === task.columnId)?.name || COLUMN_FALLBACK_NAME;

    // Simple Markdown parsing for Trace
    const parsedTrace = this.parseTraceMarkdown(traceMarkdown);

    // Get status color for left border
    const statusColors: Record<string, string> = {
      todo: '#6b7280',
      in_progress: '#22c55e',
      needs_feedback: '#eab308',
      blocked: '#ef4444'
    };
    const statusColor = statusColors[task.status || 'todo'] || statusColors.todo;

    // Page-specific styles
    const pageStyles = `<style>
      /* Page-specific overrides */
      body {
        padding: 0; margin: 0;
        font-family: var(--vscode-font-family);
      }
      
      /* Status indicator bar at top */
      .status-bar {
        height: 4px;
        background: ${statusColor};
      }
      
      /* Sticky Header */
      .header {
        position: sticky; top: 0; z-index: 100;
        background: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        padding: 16px 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .header-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      .header-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      
      /* Title Input */
      input.title-input {
        font-size: 18px; font-weight: 600;
        background: transparent; border: none; color: inherit; 
        flex: 1; min-width: 0; outline: none; border-bottom: 2px solid transparent;
        font-family: inherit;
        padding-bottom: 4px;
        transition: border-color 0.2s;
      }
      input.title-input:focus { border-bottom-color: var(--vscode-focusBorder); }

      /* Controls */
      select, input[type="text"] {
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        padding: 4px 8px; border-radius: 4px;
        font-family: inherit;
        font-size: 13px;
        height: 28px;
      }
      select:focus, input[type="text"]:focus {
        border-color: var(--vscode-focusBorder);
        outline: none;
      }

      .badge {
        padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500;
        text-transform: none; letter-spacing: normal; white-space: nowrap; flex-shrink: 0;
        line-height: 1.4;
      }
      .badge-id { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
      
      /* Main Content */
      .container { max-width: 800px; margin: 0 auto; padding: 32px; }
      
      .section { margin-bottom: 40px; }
      .section-title { 
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; 
        color: var(--vscode-descriptionForeground); margin-bottom: 8px; 
        font-weight: 600;
        display: flex; align-items: center; justify-content: space-between;
      }

      /* Summary */
      textarea.summary-input {
        width: 100%; min-height: 120px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        padding: 12px; font-family: var(--vscode-editor-font-family); 
        resize: vertical;
        border-radius: 4px;
        line-height: 1.5;
        font-size: 13px;
      }
      textarea.summary-input:focus {
        border-color: var(--vscode-focusBorder);
        outline: none;
      }

      /* Buttons */
      button {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: none; padding: 6px 14px; border-radius: 2px;
        cursor: pointer; font-family: inherit; font-size: 13px;
        transition: background 0.2s;
      }
      button:hover { background: var(--vscode-button-secondaryHoverBackground); }
      
      button.btn-danger {
        background: var(--vscode-errorForeground); color: white;
      }
      button.btn-danger:hover { opacity: 0.9; }

      /* Timeline / Trace */
      .timeline { position: relative; padding-left: 20px; margin-top: 16px; }
      .timeline::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
        background: var(--vscode-textSeparator-foreground); opacity: 0.3;
      }
      .trace-item { position: relative; margin-bottom: 24px; padding-left: 16px; }
      .trace-item::before {
        content: ''; position: absolute; left: -24px; top: 6px; width: 8px; height: 8px;
        border-radius: 50%; background: var(--vscode-textLink-foreground);
        border: 2px solid var(--vscode-editor-background);
      }
      .trace-date { font-size: 10px; color: var(--vscode-descriptionForeground); margin-bottom: 4px; opacity: 0.8; }
      .trace-content { 
        background: var(--vscode-textBlockQuote-background); 
        padding: 12px; border-radius: 6px;
        position: relative;
      }
      .trace-content h3 { margin-top: 0; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
      .trace-content p { margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; opacity: 0.9; }
      .trace-content li { font-size: 12px; margin-bottom: 4px; }
      
      /* Actions */
      .actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 40px; border-top: 1px solid var(--vscode-textSeparator-foreground); padding-top: 24px; }
    </style>`;

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
  <div class="header">
    <div class="header-top">
      <input type="text" class="title-input" id="title" value="${task.title}" placeholder="Task Title">
      <span class="badge badge-id">${task.id}</span>
    </div>
    <div class="header-row">
      <select id="status">
        ${this.renderStatusOptions(task.status)}
      </select>
      <select id="column">
        ${columns.map(c => `<option value="${c.id}" ${c.id === task.columnId ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
      <div style="flex:1"></div>
      <div>Owner: <strong>${task.owner || 'Unassigned'}</strong>${task.activeSession ? ` (Agent: ${task.activeSession.agent})` : ''}</div>
    </div>
  </div>

  <div class="container">
    <div class="section">
      <div class="section-title">Overview</div>
      <textarea id="summary" class="summary-input" placeholder="Task summary...">${task.summary || ''}</textarea>
    </div>

    <div class="section">
      <div class="section-title">Decision Trace (Live Activity)</div>
      <div class="timeline">
        ${parsedTrace || '<div style="padding:10px; color:var(--vscode-descriptionForeground)">No activity recorded yet.</div>'}
      </div>
    </div>
    
    <div class="actions">
      <button id="saveBtn" class="btn-ghost">Save</button>
      <button class="btn-danger" id="deleteBtn">Delete Task</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function collect() {
      return {
        title: document.getElementById('title').value,
        status: document.getElementById('status').value,
        columnId: document.getElementById('column').value,
        summary: document.getElementById('summary').value
      };
    }

    document.getElementById('saveBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'save', data: collect() });
    });

    document.getElementById('deleteBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'delete' });
    });

    // Auto-save debounced
    let timeout;
    const inputs = ['title', 'status', 'column', 'summary'];
    inputs.forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          vscode.postMessage({ type: 'update', data: collect() });
        }, 1000);
      });
    });
  </script>
</body>
</html>`;
  }

  private renderStatusOptions(current?: string): string {
    const statuses = ['todo', 'in_progress', 'needs_feedback', 'blocked'];
    return statuses.map(s => {
      const label = s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `<option value="${s}" ${s === current ? 'selected' : ''}>${label}</option>`;
    }).join('');
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
