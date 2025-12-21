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
          await this.deleteTask(taskId);
          webviewPanel.dispose();
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
    const checklist = task.checklist || [];
    const checklistHtml = checklist.length > 0
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
    :root { color-scheme: var(--vscode-colorScheme); }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { margin: 0 0 20px; font-size: 24px; }
    .meta { color: var(--vscode-descriptionForeground); margin-bottom: 20px; font-size: 12px; }
    label { display: block; font-weight: 600; margin-bottom: 4px; margin-top: 16px; }
    input[type="text"], textarea, select {
      width: 100%; box-sizing: border-box; padding: 8px;
      border: 1px solid var(--vscode-input-border, #444);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    textarea { min-height: 100px; resize: vertical; }
    .row { display: flex; gap: 16px; }
    .row > div { flex: 1; }
    .section { margin-top: 24px; border-top: 1px solid var(--vscode-panel-border, #333); padding-top: 16px; }
    .section h2 { margin: 0 0 12px; font-size: 16px; }
    .checklist-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .checklist-item .done { text-decoration: line-through; opacity: 0.6; }
    .empty-hint { color: var(--vscode-descriptionForeground); font-style: italic; }
    .actions { margin-top: 24px; display: flex; gap: 12px; }
    .btn {
      padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .btn:hover { opacity: 0.9; }
    .btn-delete { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; }
    .save-indicator { color: var(--vscode-descriptionForeground); font-size: 12px; margin-left: auto; opacity: 0; transition: opacity 0.3s; }
    .save-indicator.visible { opacity: 1; }
  </style>
</head>
<body>
  <h1 contenteditable="true" id="title">${task.title}</h1>
  <div class="meta">
    <span id="taskId">${task.id}</span> • Column: ${columnName} • Status: ${task.status || 'todo'}
  </div>

  <label for="summary">Summary</label>
  <textarea id="summary">${task.summary || ''}</textarea>

  <div class="row">
    <div>
      <label for="priority">Priority</label>
      <select id="priority">
        <option value="" ${!task.priority ? 'selected' : ''}></option>
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

  <label for="tags">Tags (comma separated)</label>
  <input type="text" id="tags" value="${(task.tags || []).join(', ')}">

  <div class="section">
    <h2>Checklist</h2>
    <div id="checklist">${checklistHtml}</div>
    <input type="text" id="newChecklistItem" placeholder="Add checklist item..." style="margin-top:8px;">
  </div>

  <div class="actions">
    <button class="btn btn-delete" id="deleteBtn">Delete Task</button>
    <span class="save-indicator" id="saveIndicator">✓ Saved</span>
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

    // Delete button
    document.getElementById('deleteBtn').addEventListener('click', () => {
      if (confirm('Delete this task?')) {
        vscode.postMessage({ type: 'delete' });
      }
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
