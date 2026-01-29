import * as vscode from 'vscode';
import { getFontLink, getSharedStyles, getCSPMeta } from '../shared/styles';

/**
 * Payload type for passing task data to/from the Task Details webview.
 */
export type TaskDetailsPayload = {
  id: string;
  title: string;
  summary?: string;
  tags?: string;
  columnId?: string;              // Column determines workflow phase
  status?: string;                // Autonomy state: ready, agent_active, needs_feedback, blocked, done
  column?: string;                // Column display name
  workflow?: string;              // DevOps workflow (e.g., /create_plan)
  upstream?: string[];            // Artifact dependencies
  downstream?: string[];          // Artifacts depending on this task
  owner?: {                       // Task Ownership
    developer?: string;
    agent?: string;
    type?: string;
    sessionId?: string;
  };
};


type WebviewMessage =
  | { type: 'update'; task: TaskDetailsPayload }
  | { type: 'delete'; id: string }
  | { type: 'claim'; id: string }
  | { type: 'openChat'; id: string }
  | { type: 'task'; task: TaskDetailsPayload }
  | { type: 'empty' };

export class BoardTaskDetailsViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private pendingTask: TaskDetailsPayload | undefined;
  private readonly onUpdateEmitter = new vscode.EventEmitter<TaskDetailsPayload>();
  private readonly onDeleteEmitter = new vscode.EventEmitter<string>();
  private readonly onClaimEmitter = new vscode.EventEmitter<string>();

  readonly onDidSubmitUpdate = this.onUpdateEmitter.event;
  readonly onDidRequestDelete = this.onDeleteEmitter.event;
  readonly onDidRequestClaim = this.onClaimEmitter.event;

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
      } else if (message.type === 'claim' && typeof message.id === 'string') {
        this.onClaimEmitter.fire(message.id);
      } else if (message.type === 'openChat' && typeof message.id === 'string') {
        const phase = this.pendingTask?.column || 'Unknown';
        vscode.commands.executeCommand('devops.startAgentSession', undefined, { taskId: message.id, phase });
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

export function registerTaskDetailsView(context: vscode.ExtensionContext): BoardTaskDetailsViewProvider {
  const provider = new BoardTaskDetailsViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('boardTaskDetailsView', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
  return provider;
}

function getCardHtml(): string {
  // Use shared design system + task-details specific styles
  const styles = /* HTML */ `
    \u003cstyle\u003e
      /* Task-Details Specific Styles */
      .row {
        display: flex;
        gap: var(--space-md);
      }
      .row \u003e div {
        flex: 1;
      }
      .actions {
        display: flex;
        gap: var(--space-md);
        margin-top: var(--space-md);
      }
      .actions button {
        flex: 1;
      }
      .save-indicator {
        text-align: center;
        font-size: var(--text-sm);
        color: var(--vscode-descriptionForeground);
        padding: var(--space-xs);
        opacity: 0;
        transition: opacity var(--transition-slow) ease;
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
        gap: var(--space-sm);
        margin-bottom: var(--space-lg);
      }
      .checkbox-row label {
        margin: 0;
        font-weight: var(--weight-normal);
      }
      .feature-section {
        margin-top: var(--space-xl);
        padding-top: var(--space-lg);
      }
      .feature-section h3 {
        font-size: var(--text-lg);
        font-weight: var(--weight-semibold);
        font-weight: var(--weight-semibold);
        margin-bottom: var(--space-md);
      }
      .owner-section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
        padding: var(--space-sm) var(--space-md);
        margin-bottom: var(--space-md);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .owner-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .owner-label {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .owner-name {
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .agent-active {
        color: var(--status-agent-active);
        font-size: 11px;
        background: rgba(34, 197, 94, 0.1);
        padding: 1px 6px;
        border-radius: 99px;
      }
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-sm);
      }
      .section-header h3 {
        margin: 0;
      }
      .feature-task-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
      }
      .feature-task-card {
        border: 1px solid var(--border-normal);
        border-radius: 8px;
        padding: var(--space-lg);
        background: var(--vscode-editor-background);
        box-shadow: var(--shadow-sm);
        transition: all var(--transition-normal) ease;
      }
      .feature-task-card:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--border-strong);
      }
      .feature-task-header {
        display: flex;
        gap: var(--space-md);
      }
      .feature-task-header input {
        flex: 1;
        margin-bottom: 0;
      }
      .feature-task-progress {
        font-size: var(--text-base);
        color: var(--vscode-descriptionForeground);
        margin: var(--space-sm) 0;
      }
      .feature-task-summary textarea {
        min-height: 60px;
      }
      .feature-task-items {
        margin-top: var(--space-md);
      }
      .item-row {
        display: flex;
        gap: var(--space-sm);
        align-items: center;
        margin-bottom: var(--space-sm);
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
        border: 1px solid var(--border-subtle);
        background: transparent;
        color: var(--vscode-descriptionForeground);
        padding: 0 var(--space-sm);
        border-radius: 4px;
        flex: 0;
        cursor: pointer;
        transition: all var(--transition-fast) ease;
      }
      .icon-button:hover {
        border-color: var(--border-normal);
        background: rgba(255, 255, 255, 0.05);
      }
      .icon-button.danger {
        color: var(--status-blocked);
        border-color: var(--status-blocked);
      }
      .icon-button.danger:hover {
        background: rgba(239, 68, 68, 0.1);
      }
      .feature-empty {
        font-size: var(--text-base);
        color: var(--vscode-descriptionForeground);
        text-align: center;
        padding: var(--space-md);
        border: 1px dashed var(--border-subtle);
        border-radius: 4px;
      }
      .section-hint {
        font-size: var(--text-base);
        color: var(--vscode-descriptionForeground);
        margin: 0 0 var(--space-md) 0;
        opacity: 0.85;
      }
      .inline-actions {
        display: flex;
        gap: var(--space-md);
        justify-content: flex-end;
        margin-top: var(--space-md);
      }
      /* Artifact badges */
      .artifacts-section {
        margin-top: var(--space-lg);
        padding-top: var(--space-xs);
      }
      .artifacts-section label {
        font-size: var(--text-sm);
        margin-bottom: var(--space-xs);
      }
      .artifact-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-xs);
        margin-bottom: var(--space-md);
        min-height: 24px;
      }
      .artifact-badge {
        background: rgba(20, 184, 166, 0.12);
        border: 1px solid rgba(20, 184, 166, 0.25);
        border-radius: 4px;
        padding: 2px var(--space-md);
        font-size: var(--text-sm);
        color: #5b72e8;
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
      }
      .artifact-badge.upstream::before { content: "↑"; opacity: 0.7; }
      .artifact-badge.downstream::before { content: "↓"; opacity: 0.7; }
      .artifact-badge .remove-btn {
        background: none;
        border: none;
        color: var(--status-blocked);
        cursor: pointer;
        font-size: var(--text-lg);
        padding: 0 2px;
        line-height: 1;
      }
      .add-artifact-btn {
        background: transparent;
        border: 1px dashed rgba(20, 184, 166, 0.3);
        border-radius: 4px;
        padding: 2px var(--space-md);
        font-size: var(--text-sm);
        color: #5b72e8;
        cursor: pointer;
        transition: all var(--transition-fast) ease;
      }
      .add-artifact-btn:hover {
        background: rgba(20, 184, 166, 0.08);
        border-color: rgba(20, 184, 166, 0.4);
      }
      /* Status indicator at top */
      .status-indicator {
        display: inline-flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-lg);
        border-radius: 6px;
        font-size: var(--text-sm);
        font-weight: var(--weight-medium);
        margin-bottom: var(--space-lg);
        border-left: 4px solid var(--border-subtle);
      }
      .status-indicator[data-status="todo"] {
        border-left-color: var(--status-ready);
        background: rgba(107, 114, 128, 0.08); /* Grey */
        color: var(--status-ready);
      }
      .status-indicator[data-status="in_progress"] {
        border-left-color: var(--status-agent-active);
        background: rgba(34, 197, 94, 0.08); /* Green */
        color: var(--status-agent-active);
      }
      .status-indicator[data-status="needs_feedback"] {
        border-left-color: var(--status-needs-feedback);
        background: rgba(249, 115, 22, 0.08); /* Orange */
        color: var(--status-needs-feedback);
      }
      .status-indicator[data-status="blocked"] {
        border-left-color: var(--status-blocked);
        background: rgba(239, 68, 68, 0.08); /* Red */
        color: var(--status-blocked);
      }
    \u003c/style\u003e
  `;

  const script = /* HTML */ `
    <script>
      const vscode = acquireVsCodeApi();
      const form = document.getElementById('card-form');
      const emptyState = document.getElementById('empty-state');
      const titleInput = document.getElementById('title');
      const summaryInput = document.getElementById('summary');
      const tagsInput = document.getElementById('tags');
      const statusSelect = document.getElementById('status');
      const columnLabel = document.getElementById('columnLabel');
      const deleteBtn = document.getElementById('deleteBtn');
      const saveBtn = document.getElementById('saveBtn');
      const claimBtn = document.getElementById('claimBtn');
      const ownerContainer = document.getElementById('ownerContainer');
      const ownerNameEl = document.getElementById('ownerName');
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
        { value: 'needs_feedback', label: 'Needs Feedback' },
        { value: 'blocked', label: 'Blocked' },
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
          statusSelect.value = message.task.status || 'todo';
          columnLabel.textContent = message.task.column ? 'Column: ' + message.task.column : '';
          
          // Owner Display
          if (message.task.owner && message.task.owner.developer) {
              ownerContainer.classList.remove('hidden');
              let ownerHtml = '👤 ' + message.task.owner.developer;
              if (message.task.owner.agent) {
                  ownerHtml += \` <span class="agent-active">⚡ \${message.task.owner.agent} Active</span>\`;
              }
              ownerNameEl.innerHTML = ownerHtml;
              
              claimBtn.textContent = "Re-Claim Task";
              
              // Agent Chat Button
              const agentBtn = document.getElementById('openChatBtn');
              if (agentBtn) agentBtn.classList.remove('hidden');
          } else {
              ownerContainer.classList.add('hidden');
              claimBtn.textContent = "Start Task";
              const agentBtn = document.getElementById('openChatBtn');
              if (agentBtn) agentBtn.classList.add('hidden');
          }

          // Feedback Banner
          const banner = document.getElementById('feedbackBanner');
          if (message.task.status === 'needs_feedback') {
             banner.classList.remove('hidden');
          } else {
             banner.classList.add('hidden');
          }

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
      [statusSelect].forEach(select => {
        select.addEventListener('change', triggerAutoSave);
      });

      saveBtn.addEventListener('click', () => {
        const payload = collectTaskPayload();
        if (payload) {
          vscode.postMessage({ type: 'update', task: payload });
          saveIndicator.textContent = '✓ Saved';
          saveIndicator.classList.add('visible');
          setTimeout(() => saveIndicator.classList.remove('visible'), 2000);
        }
      });

      deleteBtn.addEventListener('click', () => {
        if (!currentTaskId) {
          return;
        }
        vscode.postMessage({ type: 'delete', id: currentTaskId });
      });

      claimBtn.addEventListener('click', () => {
        if (!currentTaskId) {
          return;
        }
        vscode.postMessage({ type: 'claim', id: currentTaskId });
      });

      document.getElementById('openChatBtn')?.addEventListener('click', () => {
          if(!currentTaskId) return;
          vscode.postMessage({ type: 'openChat', id: currentTaskId });
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
        
        <div id="feedbackBanner" class="selection-banner hidden" style="background: rgba(234, 179, 8, 0.15); border-color: #eab308; margin-bottom: 12px;">
            <span style="color: #eab308; font-size: 11px;">⚠️ Needs Feedback - Check Agent Inbox</span>
        </div>

        <div id="ownerContainer" class="owner-section hidden">
            <div class="owner-info">
                <span class="owner-label">Current Owner</span>
                <span id="ownerName" class="owner-name"></span>
            </div>
            <button id="openChatBtn" class="ghost hidden" type="button" style="font-size:10px;">Open Chat</button>
        </div>

        <label for="title">Title</label>
        <input id="title" type="text" required />

        <label for="summary">Summary</label>
        <textarea id="summary"></textarea>

        <label for="tags">Tags (comma separated)</label>
        <input id="tags" type="text" />

        <div class="row">
        <div>
            <label for="status">Status</label>
            <select id="status">
              <option value="todo">Start</option>
              <option value="in_progress">In Progress</option>
              <option value="needs_feedback">Needs Feedback</option>
              <option value="blocked">Blocked</option>
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
            <button id="addFeatureTask" type="button" class="btn-ghost btn-small">Add Checklist Task</button>
          </div>
          <p class="section-hint">Use the checklist to track progress without confusing parent tasks.</p>
          <div id="featureTasksContainer" class="feature-task-list"></div>
        </div>

        <div class="actions">
          <button id="saveBtn" type="button" class="btn-ghost">Save</button>
          <button id="claimBtn" type="button" class="btn-ghost" style="border-color: var(--brand-color); color: var(--brand-color);">Claim Task</button>
          <button id="deleteBtn" type="button" class="btn-danger">Delete Task</button>
        </div>
        <div id="saveIndicator" class="save-indicator"></div>
      </form>
    </body>
  `;


  // Assemble the final HTML with shared design system
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${getCSPMeta()}${getFontLink()}${getSharedStyles()}${styles}</head>${body}${script}</html>`;
}
