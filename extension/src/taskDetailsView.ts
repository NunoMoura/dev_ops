import * as vscode from 'vscode';

/**
 * Payload type for passing task data to/from the Task Details webview.
 */
export type TaskDetailsPayload = {
  id: string;
  title: string;
  summary?: string;
  tags?: string;
  priority?: string;
  columnId?: string;              // Column determines workflow phase
  status?: string;                // Autonomy state: todo, in_progress, blocked, pending, done
  column?: string;                // Column display name
  workflow?: string;              // DevOps workflow (e.g., /create_plan)
  upstream?: string[];            // Artifact dependencies
  downstream?: string[];          // Artifacts depending on this task
};


type WebviewMessage =
  | { type: 'update'; task: TaskDetailsPayload }
  | { type: 'delete'; id: string }
  | { type: 'task'; task: TaskDetailsPayload }
  | { type: 'empty' };

export class KanbanTaskDetailsViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private pendingTask: TaskDetailsPayload | undefined;
  private readonly onUpdateEmitter = new vscode.EventEmitter<TaskDetailsPayload>();
  private readonly onDeleteEmitter = new vscode.EventEmitter<string>();

  readonly onDidSubmitUpdate = this.onUpdateEmitter.event;
  readonly onDidRequestDelete = this.onDeleteEmitter.event;

  constructor(private readonly extensionUri: vscode.Uri) { }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = getCardHtml();
    webviewView.onDidDispose(() => {
      this.view = undefined;
    });
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      if (!message) {
        return;
      }
      if (message.type === 'update' && message.task) {
        this.onUpdateEmitter.fire(message.task);
      } else if (message.type === 'delete' && typeof message.id === 'string') {
        this.onDeleteEmitter.fire(message.id);
      }
    });
    if (this.pendingTask) {
      this.postMessage({ type: 'task', task: this.pendingTask });
    } else {
      this.postMessage({ type: 'empty' });
    }
  }

  showTask(task?: TaskDetailsPayload): void {
    this.pendingTask = task;
    if (!task) {
      this.postMessage({ type: 'empty' });
      return;
    }
    this.postMessage({ type: 'task', task });
  }

  private postMessage(message: WebviewMessage): void {
    this.view?.webview.postMessage(message);
  }
}

export function registerTaskDetailsView(context: vscode.ExtensionContext): KanbanTaskDetailsViewProvider {
  const provider = new KanbanTaskDetailsViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('kanbanTaskDetailsView', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
  return provider;
}

function getCardHtml(): string {
  const styles = /* HTML */ `
    <style>
      :root {
        color-scheme: var(--vscode-colorScheme);
      }
      body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        margin: 0;
        padding: 12px;
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
      }
      h2 {
        font-size: 16px;
        margin: 0 0 12px 0;
      }
      label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      input[type='text'],
      textarea,
      select {
        width: 100%;
        box-sizing: border-box;
        padding: 6px;
        border-radius: 4px;
        border: 1px solid var(--vscode-input-border, transparent);
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        margin-bottom: 12px;
      }
      textarea {
        min-height: 80px;
        resize: vertical;
      }
      .row {
        display: flex;
        gap: 8px;
      }
      .row > div {
        flex: 1;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      button {
        border: none;
        border-radius: 4px;
        padding: 8px;
        cursor: pointer;
        font-weight: 600;
      }
      .actions button {
        flex: 1;
      }
      #deleteBtn {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 10px 16px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s ease, transform 0.1s ease;
      }
      #deleteBtn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .save-indicator {
        text-align: center;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        padding: 4px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .save-indicator.visible {
        opacity: 1;
      }
      #empty-state {
        text-align: center;
        color: var(--vscode-descriptionForeground);
        margin-top: 40px;
      }
      .checkbox-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 12px;
      }
      .checkbox-row label {
        margin: 0;
        font-weight: 400;
      }
      .feature-section {
        border-top: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.1));
        padding-top: 12px;
        margin-top: 12px;
      }
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .section-header h3 {
        font-size: 14px;
        margin: 0;
      }
      .ghost-button {
        border: 1px dashed var(--vscode-input-border, var(--vscode-descriptionForeground));
        background: transparent;
        color: var(--vscode-foreground);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      }
      .feature-task-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .feature-task-card {
        border: 1px solid var(--vscode-input-border, rgba(255, 255, 255, 0.1));
        border-radius: 6px;
        padding: 10px;
        background: var(--vscode-sideBarSectionHeader-background, rgba(255, 255, 255, 0.02));
      }
      .feature-task-header {
        display: flex;
        gap: 8px;
      }
      .feature-task-header input {
        flex: 1;
        margin-bottom: 0;
      }
      .feature-task-progress {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin: 6px 0;
      }
      .feature-task-summary textarea {
        min-height: 60px;
      }
      .feature-task-items {
        margin-top: 8px;
      }
      .item-row {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-bottom: 6px;
      }
      .item-row input {
        flex: 1;
        margin-bottom: 0;
      }
      .item-row select {
        width: 140px;
        margin-bottom: 0;
      }
      .icon-button {
        border: 1px solid var(--vscode-input-border, transparent);
        background: transparent;
        color: var(--vscode-descriptionForeground);
        padding: 0 6px;
        border-radius: 4px;
        flex: 0;
      }
      .icon-button.danger {
        color: var(--vscode-errorForeground);
      }
      .feature-empty {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        text-align: center;
        padding: 8px;
        border: 1px dashed var(--vscode-input-border, rgba(255, 255, 255, 0.1));
        border-radius: 4px;
      }
      .section-hint {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin: 0 0 8px 0;
      }
      .inline-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 8px;
      }
      /* Artifact badges */
      .artifacts-section {
        margin-top: 12px;
        padding-top: 4px;
      }
      .artifacts-section label {
        font-size: 11px;
        margin-bottom: 4px;
      }
      .artifact-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 8px;
        min-height: 24px;
      }
      .artifact-badge {
        background: rgba(102, 126, 234, 0.15);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        color: #a5b4fc;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .artifact-badge.upstream::before { content: "↑"; opacity: 0.7; }
      .artifact-badge.downstream::before { content: "↓"; opacity: 0.7; }
      .artifact-badge .remove-btn {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-size: 14px;
        padding: 0 2px;
        line-height: 1;
      }
      .add-artifact-btn {
        background: transparent;
        border: 1px dashed rgba(102, 126, 234, 0.4);
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        color: #a5b4fc;
        cursor: pointer;
      }
      .add-artifact-btn:hover {
        background: rgba(102, 126, 234, 0.1);
      }
      /* Status header colors */
      .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        border-radius: 6px;
        margin-bottom: 12px;
        border-left: 4px solid #6b7280;
      }
      .status-header[data-status="in_progress"] { border-left-color: #22c55e; background: rgba(34, 197, 94, 0.1); }
      .status-header[data-status="blocked"] { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
      .status-header[data-status="pending"] { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
      .status-header[data-status="done"] { border-left-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
      .status-header .task-id {
        font-weight: 600;
        color: var(--vscode-foreground);
      }
      .status-header .status-label {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }
    </style>
  `;

  const script = /* HTML */ `
    <script>
      const vscode = acquireVsCodeApi();
      const form = document.getElementById('card-form');
      const emptyState = document.getElementById('empty-state');
      const titleInput = document.getElementById('title');
      const summaryInput = document.getElementById('summary');
      const tagsInput = document.getElementById('tags');
      const prioritySelect = document.getElementById('priority');
      const statusSelect = document.getElementById('status');
      const columnLabel = document.getElementById('columnLabel');
      const deleteBtn = document.getElementById('deleteBtn');
      const saveBtn = document.getElementById('saveBtn');
      const featureTasksContainer = document.getElementById('featureTasksContainer');
      const addFeatureTaskBtn = document.getElementById('addFeatureTask');
      const upstreamContainer = document.getElementById('upstreamArtifacts');
      const downstreamContainer = document.getElementById('downstreamArtifacts');

      let currentTaskId;
      let featureTasks = [];
      let upstreamArtifacts = [];
      let downstreamArtifacts = [];

      function renderArtifacts() {
        // Render upstream
        upstreamContainer.innerHTML = '';
        upstreamArtifacts.forEach((artifact, index) => {
          const badge = document.createElement('span');
          badge.className = 'artifact-badge upstream';
          badge.textContent = artifact;
          upstreamContainer.appendChild(badge);
        });
        if (!upstreamArtifacts.length) {
          upstreamContainer.innerHTML = '<span style="font-size:11px;color:var(--vscode-descriptionForeground);">None</span>';
        }
        
        // Render downstream
        downstreamContainer.innerHTML = '';
        downstreamArtifacts.forEach((artifact, index) => {
          const badge = document.createElement('span');
          badge.className = 'artifact-badge downstream';
          badge.textContent = artifact;
          downstreamContainer.appendChild(badge);
        });
        if (!downstreamArtifacts.length) {
          downstreamContainer.innerHTML = '<span style="font-size:11px;color:var(--vscode-descriptionForeground);">None</span>';
        }
      }
      const ITEM_STATUS_OPTIONS = [
        { value: 'todo', label: 'Todo' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'review', label: 'In Review' },
        { value: 'done', label: 'Done' },
      ];

      function generateId(prefix) {
        return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(16).slice(2, 6);
      }

      function normalizeItemStatus(status) {
        return ITEM_STATUS_OPTIONS.some((option) => option.value === status) ? status : 'todo';
      }

      function cloneFeatureTasks(input) {
        if (!Array.isArray(input)) {
          return [];
        }
        return input.map((task) => ({
          id: task.id || generateId('feature-task'),
          title: task.title || '',
          summary: task.summary || '',
          items: Array.isArray(task.items)
            ? task.items.map((item) => ({
                id: item.id || generateId('feature-item'),
                title: item.title || '',
                status: normalizeItemStatus(item.status),
              }))
            : [],
        }));
      }

      function computeTaskProgress(task) {
        const total = Array.isArray(task.items) ? task.items.length : 0;
        const done = Array.isArray(task.items) ? task.items.filter((item) => item.status === 'done').length : 0;
        return { total, done };
      }

      function formatProgress(task) {
        const progress = computeTaskProgress(task);
        return progress.done + '/' + progress.total + ' items complete';
      }

      function createItemRow(taskIndex, itemIndex, onStatusChange) {
        const row = document.createElement('div');
        row.className = 'item-row';
        const item = featureTasks[taskIndex].items[itemIndex];

        const titleField = document.createElement('input');
        titleField.type = 'text';
        titleField.placeholder = 'Item title';
        titleField.value = item.title || '';
        titleField.addEventListener('input', (event) => {
          featureTasks[taskIndex].items[itemIndex].title = event.target.value;
        });
        row.appendChild(titleField);

        const statusSelect = document.createElement('select');
        ITEM_STATUS_OPTIONS.forEach((option) => {
          const opt = document.createElement('option');
          opt.value = option.value;
          opt.textContent = option.label;
          statusSelect.appendChild(opt);
        });
        statusSelect.value = item.status || 'todo';
        statusSelect.addEventListener('change', (event) => {
          featureTasks[taskIndex].items[itemIndex].status = event.target.value;
          onStatusChange();
        });
        row.appendChild(statusSelect);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'icon-button danger';
        removeBtn.title = 'Remove item';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
          featureTasks[taskIndex].items.splice(itemIndex, 1);
          renderFeatureTasks();
        });
        row.appendChild(removeBtn);

        return row;
      }

      function renderFeatureTasks() {
        if (!featureTasksContainer) {
          return;
        }
        featureTasksContainer.innerHTML = '';
        if (!featureTasks.length) {
          const empty = document.createElement('div');
          empty.className = 'feature-empty';
          empty.textContent = 'No checklist entries yet. Add one to break down the feature.';
          featureTasksContainer.appendChild(empty);
          return;
        }
        featureTasks.forEach((task, taskIndex) => {
          const card = document.createElement('div');
          card.className = 'feature-task-card';

          const header = document.createElement('div');
          header.className = 'feature-task-header';
          const titleField = document.createElement('input');
          titleField.type = 'text';
          titleField.placeholder = 'Task title';
          titleField.value = task.title || '';
          titleField.addEventListener('input', (event) => {
            featureTasks[taskIndex].title = event.target.value;
          });
          header.appendChild(titleField);

          const removeTaskBtn = document.createElement('button');
          removeTaskBtn.type = 'button';
          removeTaskBtn.className = 'icon-button danger';
          removeTaskBtn.title = 'Remove task';
          removeTaskBtn.textContent = '×';
          removeTaskBtn.addEventListener('click', () => {
            featureTasks.splice(taskIndex, 1);
            renderFeatureTasks();
          });
          header.appendChild(removeTaskBtn);
          card.appendChild(header);

          const progressEl = document.createElement('div');
          progressEl.className = 'feature-task-progress';
          progressEl.textContent = formatProgress(task);
          card.appendChild(progressEl);

          const summaryWrapper = document.createElement('div');
          summaryWrapper.className = 'feature-task-summary';
          const summaryLabel = document.createElement('label');
          summaryLabel.textContent = 'Summary';
          summaryWrapper.appendChild(summaryLabel);
          const summaryField = document.createElement('textarea');
          summaryField.placeholder = 'Describe the task outcome or goal';
          summaryField.value = task.summary || '';
          summaryField.addEventListener('input', (event) => {
            featureTasks[taskIndex].summary = event.target.value;
          });
          summaryWrapper.appendChild(summaryField);
          card.appendChild(summaryWrapper);

          const itemsWrapper = document.createElement('div');
          itemsWrapper.className = 'feature-task-items';
          const itemsLabel = document.createElement('label');
          itemsLabel.textContent = 'Items';
          itemsWrapper.appendChild(itemsLabel);

          if (!task.items.length) {
            const placeholder = document.createElement('div');
            placeholder.className = 'feature-empty';
            placeholder.textContent = 'No checklist items yet.';
            itemsWrapper.appendChild(placeholder);
          } else {
            task.items.forEach((_item, itemIndex) => {
              const row = createItemRow(taskIndex, itemIndex, () => {
                progressEl.textContent = formatProgress(featureTasks[taskIndex]);
              });
              itemsWrapper.appendChild(row);
            });
          }

          card.appendChild(itemsWrapper);

          const addItemRow = document.createElement('div');
          addItemRow.className = 'inline-actions';
          const addItemBtn = document.createElement('button');
          addItemBtn.type = 'button';
          addItemBtn.className = 'ghost-button';
          addItemBtn.textContent = 'Add Item';
          addItemBtn.addEventListener('click', () => {
            featureTasks[taskIndex].items.push({ id: generateId('feature-item'), title: '', status: 'todo' });
            renderFeatureTasks();
          });
          addItemRow.appendChild(addItemBtn);
          card.appendChild(addItemRow);

          featureTasksContainer.appendChild(card);
        });
      }

      function serializeFeatureTasks() {
        return featureTasks.map((task) => ({
          id: task.id,
          title: task.title,
          summary: task.summary,
          items: task.items.map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
          })),
        }));
      }

      addFeatureTaskBtn?.addEventListener('click', () => {
        featureTasks.push({ id: generateId('feature-task'), title: '', summary: '', items: [] });
        renderFeatureTasks();
      });

      renderFeatureTasks();

      window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message) {
          return;
        }
        if (message.type === 'empty') {
          currentTaskId = undefined;
          featureTasks = [];
          renderFeatureTasks();
          form.classList.add('hidden');
          emptyState.classList.remove('hidden');
          return;
        }
        if (message.type === 'task' && message.task) {
          currentTaskId = message.task.id;
          titleInput.value = message.task.title || '';
          summaryInput.value = message.task.summary || '';
          tagsInput.value = message.task.tags || '';
          prioritySelect.value = message.task.priority || '';
          statusSelect.value = message.task.status || 'todo';
          columnLabel.textContent = message.task.column ? 'Column: ' + message.task.column : '';
          featureTasks = cloneFeatureTasks(message.task.featureTasks);
          upstreamArtifacts = Array.isArray(message.task.upstream) ? [...message.task.upstream] : [];
          downstreamArtifacts = Array.isArray(message.task.downstream) ? [...message.task.downstream] : [];
          renderFeatureTasks();
          renderArtifacts();
          form.classList.remove('hidden');
          emptyState.classList.add('hidden');
        }
      });

      function collectTaskPayload() {
        if (!currentTaskId) {
          return undefined;
        }
        return {
          id: currentTaskId,
          title: titleInput.value,
          summary: summaryInput.value,
          tags: tagsInput.value,
          priority: prioritySelect.value,
          status: statusSelect.value,
          featureTasks: serializeFeatureTasks(),
        };
      }

      // Auto-save with debounce
      let saveTimeout;
      const saveIndicator = document.getElementById('saveIndicator');
      
      function triggerAutoSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          const payload = collectTaskPayload();
          if (payload) {
            vscode.postMessage({ type: 'update', task: payload });
            saveIndicator.textContent = '✓ Saved';
            saveIndicator.classList.add('visible');
            setTimeout(() => saveIndicator.classList.remove('visible'), 2000);
          }
        }, 500);
      }

      // Attach auto-save to all inputs
      [titleInput, summaryInput, tagsInput].forEach(input => {
        input.addEventListener('input', triggerAutoSave);
      });
      [prioritySelect, statusSelect].forEach(select => {
        select.addEventListener('change', triggerAutoSave);
      });

      deleteBtn.addEventListener('click', () => {
        if (!currentTaskId) {
          return;
        }
        vscode.postMessage({ type: 'delete', id: currentTaskId });
      });
    </script>
  `;

  const body = /* HTML */ `
    <body>
      <div id="empty-state">Select a task from the board to edit its details.</div>
      <form id="card-form" class="hidden" onsubmit="return false;">
        <h2>Task Details</h2>
        <div
          id="columnLabel"
          style="margin-bottom: 8px; font-size: 12px; color: var(--vscode-descriptionForeground);"
        ></div>
        <label for="title">Title</label>
        <input id="title" type="text" required />

        <label for="summary">Summary</label>
        <textarea id="summary"></textarea>

        <label for="tags">Tags (comma separated)</label>
        <input id="tags" type="text" />

        <div class="row">
          <div>
            <label for="priority">Priority</label>
            <select id="priority">
              <option value=""></option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        <div>
            <label for="status">Status</label>
            <select id="status">
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="pending">Pending Approval</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div class="feature-section">
          <div class="section-header">
            <h3>Linked Artifacts</h3>
          </div>
          <div class="artifacts-section">
            <label>Upstream (reads from)</label>
            <div id="upstreamArtifacts" class="artifact-list"></div>
            <label>Downstream (produces)</label>
            <div id="downstreamArtifacts" class="artifact-list"></div>
          </div>
        </div>

        <div class="feature-section">
          <div class="section-header">
            <h3>Checklist</h3>
            <button id="addFeatureTask" type="button" class="ghost-button">Add Checklist Task</button>
          </div>
          <p class="section-hint">Use the checklist to track progress without confusing parent tasks.</p>
          <div id="featureTasksContainer" class="feature-task-list"></div>
        </div>


        <div class="actions">
          <button id="deleteBtn" type="button">Delete Task</button>
        </div>
        <div id="saveIndicator" class="save-indicator"></div>
      </form>
    </body>
  `;

  const baseStyles = /* HTML */ `
    <style>
      .hidden {
        display: none;
      }
    </style>
  `;

  const cspMeta =
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src vscode-resource: data:; script-src 'unsafe-inline'; style-src 'unsafe-inline';\" />";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${cspMeta}${styles}${baseStyles}</head>${body}${script}</html>`;
}
