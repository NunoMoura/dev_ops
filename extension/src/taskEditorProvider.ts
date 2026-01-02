import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readBoard, writeBoard, getBoardPath } from './features/boardStore';
import { Task, ChecklistItem, COLUMN_FALLBACK_NAME, TaskStatus } from './features/types';

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
      switch (message.type) {
        case 'update':
          await this.updateTask(taskId, message.data);
          break;
        case 'save':
          await this.updateTask(taskId, message.data);
          vscode.window.showInformationMessage(`✅ Saved task ${taskId}`);
          // trigger update to refresh view if needed
          await updateWebview();
          vscode.commands.executeCommand('devops.refreshBoard');
          break;
        case 'delete':
          const confirmed = await vscode.window.showWarningMessage(`Delete task ${taskId}?`, { modal: true }, 'Delete');
          if (confirmed === 'Delete') {
            await this.deleteTask(taskId);
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
    if (!workspaceFolders) return undefined;
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

  private async updateTask(taskId: string, data: Partial<Task>): Promise<void> {
    const board = await readBoard();
    const task = board.items.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, data);
      task.updatedAt = new Date().toISOString();
      await writeBoard(board);
    }
  }

  private async deleteTask(taskId: string): Promise<void> {
    const board = await readBoard();
    board.items = board.items.filter(t => t.id !== taskId);
    await writeBoard(board);
    vscode.commands.executeCommand('devops.refreshBoard');
  }

  private getErrorHtml(message: string): string {
    return `<html><body><h2 style="color:red">${message}</h2></body></html>`;
  }

  private getEditorHtml(task: Task, columns: Array<{ id: string; name: string }>, traceMarkdown: string): string {
    const statusLabel = {
      ready: 'Ready',
      agent_active: 'Active',
      in_progress: 'In Progress',
      needs_feedback: 'Feedback',
      blocked: 'Blocked',
      done: 'Done'
    }[task.status || 'ready'] || task.status;

    const currentColumn = columns.find(c => c.id === task.columnId)?.name || COLUMN_FALLBACK_NAME;

    // Simple Markdown parsing for Trace
    const parsedTrace = this.parseTraceMarkdown(traceMarkdown);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${task.title}</title>
  <style>
    :root {
      --vscode-editor-font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      --status-ready: #3b82f6;
      --status-active: #22c55e;
      --status-feedback: #f97316;
      --status-blocked: #ef4444;
      --status-done: #6b7280;
    }
    body {
      padding: 0; margin: 0;
      font-family: var(--vscode-editor-font-family);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
    }
    /* Sticky Header */
    .header {
      position: sticky; top: 0; z-index: 100;
      background: var(--vscode-editor-background);
      border-bottom: 1px solid var(--vscode-widget-border);
      padding: 10px 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .header-row { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
    
    /* Title Input */
    input.title-input {
      font-size: 1.2rem; font-weight: 600;
      background: transparent; border: none; color: inherit; width: 100%;
      outline: none; border-bottom: 2px solid transparent;
    }
    input.title-input:focus { border-bottom-color: var(--vscode-focusBorder); }

    /* Controls */
    select {
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      padding: 4px; border-radius: 4px;
    }

    .badge {
      padding: 2px 8px; border-radius: 99px; font-size: 0.8rem; font-weight: 500;
      text-transform: uppercase;
    }
    .badge-id { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    
    /* Main Content */
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    
    .section { margin-bottom: 30px; }
    .section-title { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); margin-bottom: 10px; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 5px; }

    /* Summary */
    textarea.summary-input {
      width: 100%; min-height: 80px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 8px; font-family: inherit; resize: vertical;
    }

    /* Timeline / Trace */
    .timeline { position: relative; padding-left: 20px; }
    .timeline::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
      background: var(--vscode-widget-border);
    }
    .trace-item { position: relative; margin-bottom: 20px; padding-left: 15px; }
    .trace-item::before {
      content: ''; position: absolute; left: -24px; top: 6px; width: 10px; height: 10px;
      border-radius: 50%; background: var(--vscode-button-background);
      border: 2px solid var(--vscode-editor-background);
    }
    .trace-date { font-size: 0.8rem; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
    .trace-content { background: var(--vscode-textBlockQuote-background); padding: 10px; border-radius: 4px; }
    .trace-content h3 { margin-top: 0; font-size: 1rem; }
    
    /* Actions */
    .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    button {
      padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer;
      background: var(--vscode-button-background); color: var(--vscode-button-foreground);
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.delete { background: var(--status-blocked); }
  </style>
</head>
<body>
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
      <div>Owner: <strong>${task.owner?.name || 'Unassigned'}</strong> (${task.owner?.type || '-'})</div>
      <button id="saveBtn">Save</button>
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
      <button class="delete" id="deleteBtn">Delete Task</button>
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
    const statuses = ['ready', 'agent_active', 'in_progress', 'needs_feedback', 'blocked', 'done'];
    return statuses.map(s =>
      `<option value="${s}" ${s === current ? 'selected' : ''}>${s.replace('_', ' ').toUpperCase()}</option>`
    ).join('');
  }

  private parseTraceMarkdown(md: string): string {
    if (!md) return '';

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
