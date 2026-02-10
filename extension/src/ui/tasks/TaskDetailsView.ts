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

  priority?: string;
  owner?: {                       // Task Ownership
    developer?: string;
    agent?: string; // Agent name
    model?: string; // Model name
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
    console.log('[TaskDetailsViewV3] Resolving WebviewView');
    webviewView.onDidDispose(() => {
      this.view = undefined;
      console.log('[TaskDetailsViewV3] Webview Disposed');
    });
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      console.log('[TaskDetailsViewV3] Received Message:', message.type);
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
    console.log('[TaskDetailsViewV3] Posting Message:', message.type);
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
    <style>
      /* Task-Details Specific Styles */
      :root {
        --status-color: var(--border-subtle);
      }
      body[data-status="todo"] { --status-color: var(--status-ready, #9ca3af); }
      body[data-status="in_progress"] { --status-color: var(--status-agent-active, #22c55e); }
      body[data-status="needs_feedback"] { --status-color: var(--status-needs-feedback, #f97316); }
      body[data-status="blocked"] { --status-color: var(--status-blocked, #ef4444); }
      body[data-status="done"] { --status-color: #3b82f6; }

      .highlight-section, .feature-section {
        margin-top: var(--space-xl);
        padding-top: var(--space-sm);
        border-left: 3px solid var(--status-color);
        padding-left: var(--space-md);
        transition: border-color 0.3s ease;
      }

      .highlight-section h3, .feature-section h3 {
        font-size: var(--text-lg);
        font-weight: var(--weight-semibold);
        margin-bottom: var(--space-md);
        margin-top: 0;
      }
      
      .separator {
        height: 1px;
        background: var(--status-color);
        opacity: 0.2;
        margin: var(--space-xl) 0;
        transition: background-color 0.3s ease;
      }

      .row {
        display: flex;
        gap: var(--space-md);
      }
      .row > div {
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

      .owner-section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--status-color);
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
      
      /* Status List Styles */
      .status-list {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .status-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-subtle);
        transition: all 0.2s ease;
        opacity: 0.7;
        position: relative;
        background: transparent;
        color: var(--vscode-descriptionForeground);
      }
      .status-option:last-child {
        border-bottom: none;
      }
      .status-option:hover {
        opacity: 1;
        background: var(--vscode-list-hoverBackground);
      }
      
      /* Selected State */
      .status-option.selected {
        opacity: 1;
        background: var(--status-color);
        color: white;
        font-weight: 600;
        border-bottom-color: transparent;
      }
      .status-option.selected .status-label {
        color: white;
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
      /* Metadata Grid */
      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-sm);
        margin-top: var(--space-sm);
      }
      .meta-item {
        display: flex;
        flex-direction: column;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: var(--text-sm);
      }
      .meta-label {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .meta-value {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
      const statusList = document.getElementById('statusList');
      const columnLabel = document.getElementById('columnLabel');
      const phaseLabel = document.getElementById('phaseLabel');
      const deleteBtn = document.getElementById('deleteBtn');
      const saveBtn = document.getElementById('saveBtn');
      const claimBtn = document.getElementById('claimBtn');
      const metadataContainer = document.getElementById('metadataContainer');
      const featureTasksContainer = document.getElementById('featureTasksContainer');
      const addFeatureTaskBtn = document.getElementById('addFeatureTask');
      let currentTaskId;
      let featureTasks = [];

      function renderArtifacts() {
        // Artifacts section removed — lineage lives on documents/artifacts, not tasks
      }
      const ITEM_STATUS_OPTIONS = [
        { value: 'todo', label: 'Start (Todo)' },
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

      function renderStatusList(currentStatus) {
        statusList.innerHTML = '';
        ITEM_STATUS_OPTIONS.forEach(opt => {
           const div = document.createElement('div');
           div.className = 'status-option';
           div.dataset.value = opt.value;
           
           if (opt.value === currentStatus) {
             div.classList.add('selected');
             div.style.backgroundColor = 'var(--status-color)'; 
             div.style.borderColor = 'var(--status-color)';
           }
           
           // Status Label
           const span = document.createElement('span');
           span.className = 'status-label';
           span.textContent = opt.label;
           div.appendChild(span);
           
           // Click Handler
           div.addEventListener('click', () => {
             updateTheme(opt.value);
             renderStatusList(opt.value);
             triggerAutoSave();
           });
           
           statusList.appendChild(div);
        });
      }

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
          
          updateTheme(message.task.status);
          renderStatusList(message.task.status || 'todo');
          
          if (phaseLabel) {
             const phaseText = message.task.column ? message.task.column : 'No Phase';
             phaseLabel.textContent = 'Phase: ' + phaseText;
             phaseLabel.style.display = 'inline-block';
          }
          
          // Metadata Display (Owner, Agent, Model)
          let metadataHtml = '';
          const owner = message.task.owner;
          
          if (owner) {
             if (owner.developer) {
                metadataHtml += \`<div class="meta-item"><span class="meta-label">Owner</span><span class="meta-value">👤 \${owner.developer}</span></div>\`;
             }
             if (owner.agent) {
                metadataHtml += \`<div class="meta-item"><span class="meta-label">Agent</span><span class="meta-value">⚡ \${owner.agent}</span></div>\`;
             }
             if (owner.model) {
                metadataHtml += \`<div class="meta-item"><span class="meta-label">Model</span><span class="meta-value">🤖 \${owner.model}</span></div>\`;
             }
             
             if (owner.developer || owner.agent) {
                 claimBtn.textContent = "Re-Claim Task";
             } else {
                 claimBtn.textContent = "Start Task";
             }
          } else {
             claimBtn.textContent = "Start Task";
          }
          
          // Agent Chat Button Logic
          const agentBtn = document.getElementById('openChatBtn');
          if (owner && (owner.developer || owner.agent)) {
             if (agentBtn) agentBtn.classList.remove('hidden');
          } else {
             if (agentBtn) agentBtn.classList.add('hidden');
          }

          metadataContainer.innerHTML = metadataHtml;
          if (metadataHtml) {
            metadataContainer.classList.remove('hidden');
          } else {
            metadataContainer.classList.add('hidden');
          }

          // Feedback Banner
          const banner = document.getElementById('feedbackBanner');
          if (message.task.status === 'needs_feedback') {
             banner.classList.remove('hidden');
          } else {
             banner.classList.add('hidden');
          }

          featureTasks = cloneFeatureTasks(message.task.featureTasks);

          renderFeatureTasks();
          renderArtifacts();
          form.classList.remove('hidden');
          emptyState.classList.add('hidden');
        }
      });

      function getSelectedStatusValue() {
          const selected = statusList.querySelector('.selected');
          if (!selected) return 'todo';
          return selected.dataset.value; 
      }

      function collectTaskPayload() {
        if (!currentTaskId) {
          return undefined;
        }
        return {
          id: currentTaskId,
          title: titleInput.value,
          summary: summaryInput.value,
          tags: tagsInput.value,
          status: getSelectedStatusValue(),
          featureTasks: serializeFeatureTasks(),
        };
      }

      function updateTheme(status) {
          const s = status || 'todo';
          document.body.setAttribute('data-status', s);
          // Also update selected item style if direct call
          const options = statusList.querySelectorAll('.status-option');
          options.forEach(opt => {
              if (opt.dataset.value === s) {
                  opt.classList.add('selected');
                  opt.style.backgroundColor = 'var(--status-color)';
                  opt.style.borderColor = 'var(--status-color)';
              } else {
                  opt.classList.remove('selected');
                  opt.style.backgroundColor = '';
                  opt.style.borderColor = '';
              }
          });
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
        
        <div id="feedbackBanner" class="selection-banner hidden" style="background: rgba(234, 179, 8, 0.15); border-color: #eab308; margin-bottom: 12px;">
            <span style="color: #eab308; font-size: 11px;">⚠️ Needs Feedback - Check Agent Inbox</span>
        </div>
        
        <div style="font-size: 9px; color: var(--vscode-disabledForeground); text-align: right; margin-bottom: 5px;">Build: ${new Date().toISOString()} (UI Refactor vFinal)</div>
        
        <!-- Title Section -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
            <label for="title">Title</label>
            <div style="display: flex; align-items: baseline; gap: 8px;">
                <input id="title" type="text" style="font-size: 16px; font-weight: 600;" required />
            </div>
            <!-- Phase Info (New Location) -->
            <div id="phaseLabel" style="font-size: 11px; color: var(--vscode-descriptionForeground); background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; align-self: start; display: none;"></div>
        </div>

        <!-- Metadata Section (Under Title) -->
        <div id="metadataContainer" class="metadata-grid hidden"></div>
        
         <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button id="openChatBtn" class="ghost hidden" type="button" style="font-size:10px; width: auto; padding: 2px 8px;">Open Chat</button>
        </div>

        <div class="separator"></div>

        <!-- Status Section (Renamed from Phase & Status) -->
        <div class="highlight-section">
            <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground);">Status</h3>
            <div id="statusList" class="status-list">
               <!-- Auto populated -->
            </div>
        </div>

        <!-- Agent Instruction Section (Summary) -->
        <div class="highlight-section">
            <label for="summary" style="font-size: var(--text-lg); font-weight: var(--weight-semibold); display: block; margin-bottom: var(--space-md);">Agent Instructions</label>
            <textarea id="summary"></textarea>
        </div>

        <!-- Tags & Extras -->
        <label for="tags">Tags</label>
        <input id="tags" type="text" placeholder="bug, feature, enhancement" />



        <div class="feature-section">
          <div class="section-header">
            <h3>Checklist</h3>
            <button id="addFeatureTask" type="button" class="btn-ghost btn-small">Add Checklist Task</button>
          </div>
          <p class="section-hint">Use the checklist to track progress without confusing parent tasks.</p>
          <div id="featureTasksContainer" class="feature-task-list"></div>
        </div>
        
        <div class="separator"></div>

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
