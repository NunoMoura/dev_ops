import * as vscode from 'vscode';
import { readKanban, writeKanban } from './features/boardStore';
import { Task, COLUMN_FALLBACK_NAME } from './features/types';

/**
 * Content provider for kanban-task:// URIs.
 * Required for CustomTextEditorProvider to work with virtual documents.
 */
class TaskDocumentContentProvider implements vscode.TextDocumentContentProvider {
  public static readonly scheme = 'kanban-task';

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    // Extract task ID from URI path (e.g., /task/TASK-001.kanban-task -> TASK-001)
    const taskId = uri.path.replace('/task/', '').replace('.kanban-task', '');

    try {
      const board = await readKanban();
      const task = board.items.find(t => t.id === taskId);
      if (task) {
        return JSON.stringify(task, null, 2);
      }
    } catch {
      // Fall through to return empty
    }
    return JSON.stringify({ id: taskId, error: 'Task not found' });
  }
}

/**
 * Custom editor provider for Kanban tasks.
 * Opens tasks in a new editor tab with a webview-based form.
 */
export class TaskEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'kanban.taskEditor';

  private static instance: TaskEditorProvider | undefined;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new TaskEditorProvider(context);
    TaskEditorProvider.instance = provider;

    // Register the content provider for the kanban-task scheme
    const contentProvider = new TaskDocumentContentProvider();
    const contentDisposable = vscode.workspace.registerTextDocumentContentProvider(
      TaskDocumentContentProvider.scheme,
      contentProvider
    );

    const editorDisposable = vscode.window.registerCustomEditorProvider(
      TaskEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );

    // Return a combined disposable
    return {
      dispose: () => {
        contentDisposable.dispose();
        editorDisposable.dispose();
      }
    };
  }

  constructor(private readonly context: vscode.ExtensionContext) { }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    // Parse task ID from document URI
    const taskId = this.getTaskIdFromUri(document.uri);

    // Load task data
    const task = await this.loadTask(taskId);
    if (!task) {
      webviewPanel.webview.html = this.getErrorHtml(`Task ${taskId} not found`);
      return;
    }

    // Get column name
    const board = await readKanban();
    const column = board.columns.find(c => c.id === task.columnId);
    const columnName = column?.name || COLUMN_FALLBACK_NAME;

    // Render webview
    webviewPanel.webview.html = this.getEditorHtml(task, columnName, board.columns);

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'update':
          await this.updateTask(taskId, message.data);
          break;
        case 'delete':
          // Show confirmation dialog from extension host (confirm() doesn't work in webviews)
          const confirmed = await vscode.window.showWarningMessage(
            `Delete task ${taskId}?`,
            { modal: true },
            'Delete'
          );
          if (confirmed === 'Delete') {
            await this.deleteTask(taskId);
            webviewPanel.dispose();
          }
          break;
      }
    });
  }

  private getTaskIdFromUri(uri: vscode.Uri): string {
    // URI format: kanban-task:/task/TASK-001.kanban-task
    return uri.path.replace('/task/', '').replace('.kanban-task', '');
  }

  private async loadTask(taskId: string): Promise<Task | undefined> {
    const board = await readKanban();
    return board.items.find(t => t.id === taskId);
  }

  private async updateTask(taskId: string, data: Partial<Task>): Promise<void> {
    const board = await readKanban();
    const task = board.items.find(t => t.id === taskId);
    if (!task) {
      return;
    }

    Object.assign(task, data);
    task.updatedAt = new Date().toISOString();
    await writeKanban(board);
  }

  private async deleteTask(taskId: string): Promise<void> {
    const board = await readKanban();
    board.items = board.items.filter(t => t.id !== taskId);
    await writeKanban(board);
    vscode.window.showInformationMessage(`Deleted task ${taskId}`);
    // Trigger board refresh
    vscode.commands.executeCommand('kanban.refresh');
  }

  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html><body style="padding:20px;font-family:sans-serif;">
<h2 style="color:#dc2626;">Error</h2>
<p>${message}</p>
</body></html>`;
  }

  private getEditorHtml(task: Task, columnName: string, columns: Array<{ id: string; name: string }>): string {
    const statusLabel = { todo: 'Todo', in_progress: 'In Progress', blocked: 'Blocked', pending: 'Pending', done: 'Done' }[task.status || 'todo'] || task.status;
    const upstreamList = (task.upstream || []).map((a: string) => `<span class="artifact-badge upstream">${a}</span>`).join('') || '<span class="empty-hint">None</span>';
    const downstreamList = (task.downstream || []).map((a: string) => `<span class="artifact-badge downstream">${a}</span>`).join('') || '<span class="empty-hint">None</span>';
    const checklist = task.checklist || [];
    const checklistDone = checklist.filter((c: any) => c.done).length;
    const checklistTotal = checklist.length;
    const progressPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
    const checklistHtml = checklistTotal > 0
      ? checklist.map((item: any, i: number) => `
        <div class="checklist-item">
          <input type="checkbox" ${item.done ? 'checked' : ''} data-index="${i}" class="checklist-check">
          <span class="${item.done ? 'done' : ''}">${item.text}</span>
        </div>`).join('')
      : '<p class="empty-hint">No checklist items</p>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    /* Design tokens - consistent across extension */
    :root {
      color-scheme: var(--vscode-colorScheme);
      --status-todo: #6b7280;
      --status-in-progress: #22c55e;
      --status-blocked: #ef4444;
      --status-pending: #f59e0b;
      --status-done: #3b82f6;
      --priority-high: #ef4444;
      --priority-medium: #f59e0b;
      --priority-low: #22c55e;
      --accent-gradient: linear-gradient(90deg, #667eea, #764ba2);
      --artifact-bg: rgba(102, 126, 234, 0.15);
      --artifact-border: rgba(102, 126, 234, 0.3);
      --artifact-text: #a5b4fc;
      --card-bg: var(--vscode-editor-background, rgba(0, 0, 0, 0.4));
      --card-border: var(--vscode-input-border, rgba(255,255,255,0.1));
      --section-bg: var(--vscode-sideBarSectionHeader-background, rgba(255, 255, 255, 0.03));
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 0;
      margin: 0;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 24px; }

    /* Status header - consistent with board cards */
    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-left: 4px solid var(--status-todo);
      background: rgba(107, 114, 128, 0.1);
      border-radius: 0 8px 8px 0;
      margin: 16px 16px 0 0;
    }
    .status-header[data-status="in_progress"] { border-left-color: var(--status-in-progress); background: rgba(34, 197, 94, 0.1); }
    .status-header[data-status="blocked"] { border-left-color: var(--status-blocked); background: rgba(239, 68, 68, 0.1); }
    .status-header[data-status="pending"] { border-left-color: var(--status-pending); background: rgba(245, 158, 11, 0.1); }
    .status-header[data-status="done"] { border-left-color: var(--status-done); background: rgba(59, 130, 246, 0.1); }
    .task-id { font-weight: 700; font-size: 14px; letter-spacing: 0.02em; }
    .status-pill { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--status-todo); }
    .status-header[data-status="in_progress"] .status-dot { background: var(--status-in-progress); }
    .status-header[data-status="blocked"] .status-dot { background: var(--status-blocked); }
    .status-header[data-status="pending"] .status-dot { background: var(--status-pending); }
    .status-header[data-status="done"] .status-dot { background: var(--status-done); }

    /* Title styling */
    h1 { 
      margin: 0 0 8px; 
      font-size: 22px; 
      font-weight: 600;
      outline: none;
      padding: 8px 0;
      border-bottom: 2px solid transparent;
      transition: border-color 0.15s ease;
    }
    h1:focus { border-bottom-color: var(--vscode-focusBorder); }
    .meta { 
      color: var(--vscode-descriptionForeground); 
      margin-bottom: 24px; 
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta::before {
      content: "📍";
      font-size: 11px;
    }

    /* Card sections */
    .card-section {
      background: var(--section-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 16px;
    }

    /* Labels - lowercase styling */
    label { 
      display: block; 
      font-weight: 500; 
      margin-bottom: 6px; 
      margin-top: 0; 
      font-size: 12px; 
      color: var(--vscode-descriptionForeground);
    }
    .card-section > label:first-child { margin-top: 0; }

    /* Form inputs */
    input[type="text"], textarea, select {
      width: 100%; 
      box-sizing: border-box; 
      padding: 10px 12px;
      border: 1px solid var(--card-border);
      background: var(--card-bg);
      color: var(--vscode-input-foreground);
      border-radius: 6px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      font-size: 13px;
    }
    input[type="text"]:hover, textarea:hover, select:hover {
      border-color: rgba(255,255,255,0.2);
    }
    input[type="text"]:focus, textarea:focus, select:focus {
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);
      outline: none;
    }
    textarea { min-height: 100px; resize: vertical; line-height: 1.5; }
    select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M3 4.5L6 8l3-3.5H3z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
    }

    /* Row layout */
    .row { display: flex; gap: 12px; }
    .row > div { flex: 1; }
    .row label { margin-top: 0; }

    /* Section styling */
    .section { 
      margin-top: 24px; 
      padding-top: 0;
    }
    .section-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--card-border);
    }
    .section h2 { 
      margin: 0; 
      font-size: 13px; 
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section h2::before {
      font-size: 14px;
    }

    /* Artifact badges - consistent with board cards */
    .artifact-row { margin-bottom: 16px; }
    .artifact-row:last-child { margin-bottom: 0; }
    .artifact-row label { 
      font-size: 11px; 
      margin-bottom: 8px;
      opacity: 0.8;
    }
    .artifact-badges { display: flex; flex-wrap: wrap; gap: 8px; min-height: 32px; align-items: center; }
    .artifact-badge {
      background: var(--artifact-bg);
      border: 1px solid var(--artifact-border);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 11px;
      color: var(--artifact-text);
      font-weight: 500;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }
    .artifact-badge:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
    }
    .artifact-badge.upstream::before { content: "↑ "; opacity: 0.7; }
    .artifact-badge.downstream::before { content: "↓ "; opacity: 0.7; }

    /* Progress bar - consistent with board cards */
    .progress-container { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .progress-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--accent-gradient); transition: width 0.3s ease; }
    .progress-text { font-size: 12px; color: var(--vscode-descriptionForeground); font-weight: 500; }

    /* Checklist */
    .checklist-item { 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      padding: 10px 0; 
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.1s ease;
    }
    .checklist-item:hover { background: rgba(255,255,255,0.02); margin: 0 -8px; padding: 10px 8px; border-radius: 4px; }
    .checklist-item:last-child { border-bottom: none; }
    .checklist-item .done { text-decoration: line-through; opacity: 0.5; }
    .checklist-check { 
      width: 18px; 
      height: 18px; 
      cursor: pointer;
      accent-color: #667eea;
    }
    .empty-hint { color: var(--vscode-descriptionForeground); font-style: italic; font-size: 12px; }

    /* Priority chips */
    .priority-chip { padding: 2px 8px; border-radius: 999px; font-size: 10px; text-transform: uppercase; font-weight: 600; }
    .priority-chip.high { background: rgba(239,68,68,0.15); color: var(--priority-high); }
    .priority-chip.medium { background: rgba(245,158,11,0.15); color: var(--priority-medium); }
    .priority-chip.low { background: rgba(34,197,94,0.15); color: var(--priority-low); }

    /* Actions */
    .actions { 
      margin-top: 32px; 
      padding-top: 24px;
      border-top: 1px solid var(--card-border);
      display: flex; 
      gap: 12px; 
      align-items: center; 
    }
    .btn {
      padding: 10px 20px; 
      border: none; 
      border-radius: 6px; 
      font-weight: 600; 
      cursor: pointer;
      font-size: 13px;
      transition: transform 0.1s ease, box-shadow 0.15s ease;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
    .btn-delete { 
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
      color: white;
    }
    .btn-delete:hover { box-shadow: 0 4px 12px rgba(239,68,68,0.4); }
    .save-indicator { 
      color: var(--status-in-progress); 
      font-size: 12px; 
      margin-left: auto; 
      opacity: 0; 
      transition: opacity 0.3s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .save-indicator.visible { opacity: 1; }
  </style>
</head>
<body>
  <div class="status-header" data-status="${task.status || 'todo'}">
    <span class="task-id">${task.id}</span>
    <div class="status-pill">
      <span class="status-dot"></span>
      <span>${statusLabel}</span>
    </div>
  </div>

  <div class="container">
    <h1 contenteditable="true" id="title">${task.title}</h1>
    <div class="meta">${columnName}</div>

    <div class="card-section">
      <label for="summary">Summary</label>
      <textarea id="summary">${task.summary || ''}</textarea>
    </div>

    <div class="card-section">
      <div class="row">
        <div>
          <label for="priority">Priority</label>
          <select id="priority">
            <option value="" ${!task.priority ? 'selected' : ''}>None</option>
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>
        <div>
          <label for="status">Status</label>
          <select id="status">
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Todo</option>
            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="blocked" ${task.status === 'blocked' ? 'selected' : ''}>Blocked</option>
            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending Approval</option>
            <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
          </select>
        </div>
        <div>
          <label for="column">Column</label>
          <select id="column">
            ${columns.map(c => `<option value="${c.id}" ${c.id === task.columnId ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="card-section">
      <label for="tags">Tags (comma separated)</label>
      <input type="text" id="tags" value="${(task.tags || []).join(', ')}">
    </div>

    <div class="card-section section">
      <div class="section-header">
        <h2>🔗 Linked Artifacts</h2>
      </div>
      <div class="artifact-row">
        <label>Upstream (reads from)</label>
        <div class="artifact-badges">${upstreamList}</div>
      </div>
      <div class="artifact-row">
        <label>Downstream (produces)</label>
        <div class="artifact-badges">${downstreamList}</div>
      </div>
    </div>

    <div class="card-section section">
      <div class="section-header">
        <h2>☑️ Checklist</h2>
        ${checklistTotal > 0 ? `<span class="progress-text">${checklistDone}/${checklistTotal}</span>` : ''}
      </div>
      ${checklistTotal > 0 ? `<div class="progress-container"><div class="progress-bar"><div class="progress-fill" style="width:${progressPercent}%"></div></div></div>` : ''}
      <div id="checklist">${checklistHtml}</div>
      <input type="text" id="newChecklistItem" placeholder="Add checklist item..." style="margin-top:12px;">
    </div>

    <div class="actions">
      <button class="btn btn-delete" id="deleteBtn">Delete Task</button>
      <span class="save-indicator" id="saveIndicator">✓ Saved</span>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let saveTimeout;
    const saveIndicator = document.getElementById('saveIndicator');

    function collectData() {
      return {
        title: document.getElementById('title').textContent.trim(),
        summary: document.getElementById('summary').value,
        priority: document.getElementById('priority').value || undefined,
        status: document.getElementById('status').value,
        columnId: document.getElementById('column').value,
        tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean),
      };
    }

    function triggerSave() {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        vscode.postMessage({ type: 'update', data: collectData() });
        saveIndicator.classList.add('visible');
        setTimeout(() => saveIndicator.classList.remove('visible'), 2000);
      }, 500);
    }

    // Auto-save on input changes
    document.getElementById('title').addEventListener('input', triggerSave);
    document.getElementById('summary').addEventListener('input', triggerSave);
    document.getElementById('priority').addEventListener('change', triggerSave);
    document.getElementById('status').addEventListener('change', triggerSave);
    document.getElementById('column').addEventListener('change', triggerSave);
    document.getElementById('tags').addEventListener('input', triggerSave);

    // Delete button - confirmation handled in extension host
    document.getElementById('deleteBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'delete' });
    });

    // New checklist item
    document.getElementById('newChecklistItem').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        // TODO: Add checklist item via postMessage
        e.target.value = '';
      }
    });
  </script>
</body>
</html>`;
  }
}

/**
 * Open a task in a new editor tab.
 */
export async function openTaskInEditor(taskId: string): Promise<void> {
  const uri = vscode.Uri.parse(`kanban-task:/task/${taskId}`);
  await vscode.commands.executeCommand('vscode.openWith', uri, TaskEditorProvider.viewType);
}
