import * as vscode from 'vscode';

export type BoardViewColumn = {
  id: string;
  name: string;
  position?: number;
};

export type BoardViewTask = {
  id: string;
  columnId: string;
  title: string;
  summary?: string;
  columnName?: string;           // Column display name
  priority?: string;
  status?: string;               // Autonomy state: todo, in_progress, blocked, pending, done
  tags?: string[];
  updatedAt?: string;
  // Artifact linking
  upstream?: string[];           // Artifacts this task reads from
  downstream?: string[];         // Artifacts this task produces
  // Progress tracking
  checklistTotal?: number;       // Total checklist items
  checklistDone?: number;        // Completed checklist items
};

export type BoardViewSnapshot = {
  columns: BoardViewColumn[];
  tasks: BoardViewTask[];
};

type WebviewMessage =
  | { type: 'ready' }
  | { type: 'moveTasks'; taskIds: string[]; columnId: string }
  | { type: 'openTask'; taskId: string }
  | { type: 'createTask'; columnId?: string }
  | { type: 'deleteTasks'; taskIds: string[] };

type WebviewEvent = { type: 'board'; data: BoardViewSnapshot };

export class KanbanBoardPanelManager {
  private panel: vscode.WebviewPanel | undefined;
  private webviewReady = false;
  private latestBoard: BoardViewSnapshot = { columns: [], tasks: [] };
  private readonly onMoveEmitter = new vscode.EventEmitter<{ taskIds: string[]; columnId: string }>();
  private readonly onOpenEmitter = new vscode.EventEmitter<string>();
  private readonly onCreateEmitter = new vscode.EventEmitter<{ columnId?: string }>();
  private readonly onDeleteEmitter = new vscode.EventEmitter<string[]>();

  readonly onDidRequestMoveTasks = this.onMoveEmitter.event;
  readonly onDidRequestOpenTask = this.onOpenEmitter.event;
  readonly onDidRequestCreateTask = this.onCreateEmitter.event;
  readonly onDidRequestDeleteTasks = this.onDeleteEmitter.event;

  constructor(private readonly extensionUri: vscode.Uri) { }

  /**
   * Opens the Kanban board in an editor panel (draggable to second monitor).
   * If already open, reveals the existing panel.
   */
  openBoard(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'kanbanBoard',
      'Kanban Board',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri],
      }
    );

    this.panel.webview.html = getBoardHtml(true); // true = panel mode (full width)

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      this.webviewReady = false;
    });

    this.panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
      if (!message) {
        return;
      }
      if (message.type === 'ready') {
        this.webviewReady = true;
        this.postBoard();
      } else if (
        message.type === 'moveTasks' &&
        Array.isArray(message.taskIds) &&
        typeof message.columnId === 'string'
      ) {
        this.onMoveEmitter.fire({ taskIds: message.taskIds, columnId: message.columnId });
      } else if (message.type === 'openTask' && typeof message.taskId === 'string') {
        this.onOpenEmitter.fire(message.taskId);
      } else if (message.type === 'createTask') {
        this.onCreateEmitter.fire({ columnId: message.columnId });
      } else if (message.type === 'deleteTasks' && Array.isArray(message.taskIds) && message.taskIds.length > 0) {
        this.onDeleteEmitter.fire(message.taskIds);
      }
    });

    this.postBoard();
  }

  setBoard(board: BoardViewSnapshot | undefined): void {
    this.latestBoard = board ?? { columns: [], tasks: [] };
    this.postBoard();
  }

  private postBoard(): void {
    if (!this.panel || !this.webviewReady) {
      return;
    }
    const message: WebviewEvent = { type: 'board', data: this.latestBoard };
    void this.panel.webview.postMessage(message);
  }

  dispose(): void {
    this.panel?.dispose();
  }
}

export function createBoardPanelManager(context: vscode.ExtensionContext): KanbanBoardPanelManager {
  const manager = new KanbanBoardPanelManager(context.extensionUri);

  // Register command to open board in editor panel
  context.subscriptions.push(
    vscode.commands.registerCommand('kanban.openBoard', () => {
      manager.openBoard();
    }),
  );

  return manager;
}

function getBoardHtml(panelMode = false): string {
  const cspMeta =
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src vscode-resource: data:; script-src 'unsafe-inline'; style-src 'unsafe-inline';\" />";

  // Panel mode: horizontal Trello-like layout (columns side by side)
  // Sidebar mode: vertical stacked columns
  const layoutStyles = panelMode
    ? `
      body {
        background: var(--vscode-editor-background);
        padding: 12px 16px;
        height: 100vh;
        overflow: hidden;
      }
      #board {
        display: flex;
        flex-direction: row;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 12px;
        flex: 1;
        align-items: stretch;
        height: calc(100vh - 80px);
      }
      .board-column {
        flex: 0 0 240px;
        min-width: 220px;
        max-width: 280px;
        display: flex;
        flex-direction: column;
        max-height: 100%;
      }
      .task-list {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
      }
      .task-card {
        padding: 8px 10px;
      }
      .task-title {
        font-size: 13px;
      }
      .task-summary {
        font-size: 11px;
        max-height: 32px;
        overflow: hidden;
      }
    `
    : `
      #board {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 12px;
        flex: 1;
      }
      .board-column {
        flex: 1;
        min-height: 200px;
      }
    `;

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
        height: 100%;
      }
      .hidden {
        display: none !important;
      }
      .board-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 100%;
      }
      .board-column {
        background: var(--vscode-sideBarSectionHeader-background, rgba(255, 255, 255, 0.03));
        border: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.08));
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .board-column.drop-target {
        border-color: var(--vscode-focusBorder);
        box-shadow: 0 0 0 1px var(--vscode-focusBorder) inset;
      }
      .column-header {
        padding: 10px 12px;
        border-bottom: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.08));
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
      }
      .column-title {
        flex: 1;
        margin-right: 8px;
      }
      .column-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .column-count {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        background: var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.08));
        padding: 1px 6px;
        border-radius: 999px;
      }
      .column-add-button {
        border: 1px solid var(--vscode-focusBorder);
        background: transparent;
        color: var(--vscode-focusBorder);
        border-radius: 4px;
        width: 24px;
        height: 24px;
        font-size: 16px;
        line-height: 1;
        padding: 0;
        cursor: pointer;
      }
      .column-add-button:hover {
        background: var(--vscode-focusBorder);
        color: var(--vscode-sideBar-background);
      }
      .task-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        overflow-y: auto;
      }
      .task-card {
        border: 1px solid var(--vscode-input-border, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 10px 10px 10px 14px;
        background: var(--vscode-editor-background, rgba(0, 0, 0, 0.4));
        cursor: grab;
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
        position: relative;
        border-left: 4px solid #6b7280; /* Default: todo gray */
      }
      /* Status-based left border colors */
      .task-card[data-status="in_progress"] { border-left-color: #22c55e; }
      .task-card[data-status="blocked"] { border-left-color: #ef4444; }
      .task-card[data-status="pending"] { border-left-color: #f59e0b; }
      .task-card[data-status="done"] { border-left-color: #3b82f6; }
      .task-card.selected {
        border-color: var(--vscode-focusBorder);
        border-left-width: 4px;
        box-shadow: 0 0 0 1px var(--vscode-focusBorder);
      }
      .task-card.dragging {
        opacity: 0.5;
      }
      .task-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }
      .task-id {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        opacity: 0.7;
      }
      .task-title {
        font-weight: 600;
        font-size: 13px;
        line-height: 1.3;
        margin-bottom: 6px;
      }
      .task-summary {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 8px;
      }
      .task-tags {
        font-size: 11px;
        color: var(--vscode-textLink-foreground);
        opacity: 0.8;
        margin-bottom: 8px;
      }
      .task-tags::before {
        content: "";
      }
      /* Artifact badges */
      .artifact-links {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }
      .artifact-badge {
        background: rgba(102, 126, 234, 0.15);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: 4px;
        padding: 1px 5px;
        font-size: 9px;
        color: #a5b4fc;
      }
      .artifact-badge.upstream::before { content: "↑ "; opacity: 0.7; }
      .artifact-badge.downstream::before { content: "↓ "; opacity: 0.7; }
      /* Progress bar */
      .progress-container {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
      }
      .progress-bar {
        flex: 1;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        transition: width 0.3s ease;
      }
      .progress-text {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        white-space: nowrap;
      }
      /* Card footer: priority/date left, status right */
      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        opacity: 0.85;
      }
      .card-footer-left {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .card-footer-left .priority {
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.05em;
        font-weight: 500;
      }
      .card-footer-left .priority-high { color: #ef4444; }
      .card-footer-left .priority-medium { color: #f59e0b; }
      .card-footer-left .priority-low { color: #22c55e; }
      .card-footer-left .date {
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.05em;
      }
      .card-footer-left .separator { opacity: 0.4; }
      .card-footer-right {
        text-transform: capitalize;
      }
      .card-footer-right.status-in_progress { color: #22c55e; }
      .card-footer-right.status-blocked { color: #ef4444; }
      .card-footer-right.status-pending { color: #f59e0b; }
      .card-footer-right.status-done { color: #3b82f6; }
      .card-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 8px;
      }
      .card-open-button {
        border: 1px solid var(--vscode-focusBorder);
        border-radius: 4px;
        background: transparent;
        color: var(--vscode-focusBorder);
        padding: 4px 10px;
        font-size: 11px;
        cursor: pointer;
      }
      .card-open-button:hover {
        background: var(--vscode-focusBorder);
        color: var(--vscode-sideBar-background);
      }
      #empty-state {
        text-align: center;
        color: var(--vscode-descriptionForeground);
        margin-top: 48px;
      }
      .selection-banner {
        border: 1px solid var(--vscode-focusBorder);
        border-radius: 6px;
        padding: 6px 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.06));
      }
      .selection-banner.hidden {
        display: none;
      }
      .selection-actions {
        display: flex;
        gap: 8px;
      }
      button.ghost {
        border: 1px solid var(--vscode-focusBorder);
        border-radius: 4px;
        background: transparent;
        color: var(--vscode-foreground);
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
      }
      button.ghost:hover {
        background: var(--vscode-focusBorder);
        color: var(--vscode-sideBar-background);
      }
      .hint {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }
      .drag-preview {
        padding: 6px 10px;
        border-radius: 6px;
        background: var(--vscode-editor-background, #1e1e1e);
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-focusBorder);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        font-size: 12px;
      }
      .board-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0 16px 0;
        border-bottom: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.08));
        margin-bottom: 16px;
      }
      .board-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--vscode-foreground);
      }
      .add-task-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 6px;
        color: white;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.1s ease, box-shadow 0.15s ease;
      }
      .add-task-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      .add-task-button:active {
        transform: translateY(0);
      }
    </style>
  `;

  const body = /* HTML */ `
    <body>
      <div class="board-wrapper">
        <div class="board-header">
          <h2 class="board-title">Kanban Board</h2>
          <button id="addTaskBtn" class="add-task-button" type="button" title="Create Task">New Task</button>
        </div>
        <div id="selectionBanner" class="selection-banner hidden">
          <div>
            <strong id="selectionCount"></strong>
            <div class="hint">Shift/Ctrl-click to toggle selection. Drag the selection to move tasks.</div>
          </div>
          <div class="selection-actions">
            <button id="clearSelection" class="ghost" type="button">Clear Selection</button>
          </div>
        </div>
        <div id="board"></div>
        <div id="empty-state" class="hint">No tasks to display. Import a plan or add a task to get started.</div>
      </div>
    </body>
  `;

  const script = /* HTML */ `
    <script>
      (function () {
        const vscode = acquireVsCodeApi();
        const boardEl = document.getElementById('board');
        const emptyState = document.getElementById('empty-state');
        const selectionBanner = document.getElementById('selectionBanner');
        const selectionCount = document.getElementById('selectionCount');
        const clearSelectionBtn = document.getElementById('clearSelection');

        const savedState = vscode.getState() || {};
        const state = {
          columns: [],
          tasks: [],
          selection: new Set(Array.isArray(savedState.selection) ? savedState.selection : []),
          dragTaskIds: [],
        };

        function persistState() {
          vscode.setState({ selection: Array.from(state.selection) });
        }

        function updateBoard(snapshot) {
          state.columns = Array.isArray(snapshot?.columns) ? snapshot.columns : [];
          state.tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : [];
          pruneSelection();
          renderBoard();
        }

        function pruneSelection() {
          const knownIds = new Set(state.tasks.map((task) => task.id));
          let changed = false;
          state.selection.forEach((id) => {
            if (!knownIds.has(id)) {
              state.selection.delete(id);
              changed = true;
            }
          });
          if (changed) {
            persistState();
          }
        }

        function renderBoard() {
          boardEl.innerHTML = '';
          if (!state.columns.length) {
            emptyState.classList.remove('hidden');
          } else {
            emptyState.classList.add('hidden');
          }
          const sortedColumns = [...state.columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          sortedColumns.forEach((column) => {
            const columnEl = document.createElement('section');
            columnEl.className = 'board-column';
            columnEl.dataset.columnId = column.id;
            columnEl.addEventListener('dragover', (event) => handleDragOver(event, columnEl));
            columnEl.addEventListener('dragleave', () => columnEl.classList.remove('drop-target'));
            columnEl.addEventListener('drop', (event) => handleDrop(event, column.id, columnEl));

            const header = document.createElement('div');
            header.className = 'column-header';
            const title = document.createElement('span');
            title.className = 'column-title';
            title.textContent = column.name;
            const count = document.createElement('span');
            count.className = 'column-count';
            const tasks = getTasksForColumn(column.id);
            count.textContent = String(tasks.length);
            header.appendChild(title);
            header.appendChild(count);
            columnEl.appendChild(header);

            const list = document.createElement('div');
            list.className = 'task-list';
            list.addEventListener('dragover', (event) => handleDragOver(event, columnEl));
            list.addEventListener('drop', (event) => handleDrop(event, column.id, columnEl));
            tasks.forEach((task) => {
              const card = renderTaskCard(task);
              list.appendChild(card);
            });
            columnEl.appendChild(list);
            boardEl.appendChild(columnEl);
          });
          updateSelectionBanner();
        }

        function getTasksForColumn(columnId) {
          return state.tasks.filter((task) => task.columnId === columnId);
        }

        function renderTaskCard(task) {
          const card = document.createElement('article');
          card.className = 'task-card';
          card.draggable = true;
          card.dataset.taskId = task.id;
          card.dataset.status = task.status || 'todo';
          if (state.selection.has(task.id)) {
            card.classList.add('selected');
          }
          card.addEventListener('click', (event) => handleCardClick(event, task.id));
          card.addEventListener('dblclick', () => openTask(task.id));
          card.addEventListener('dragstart', (event) => handleDragStart(event, task.id, card));
          card.addEventListener('dragend', () => handleDragEnd(card));

          // Title
          const title = document.createElement('div');
          title.className = 'task-title';
          title.textContent = task.title;
          card.appendChild(title);

          // Summary
          if (task.summary) {
            const summary = document.createElement('div');
            summary.className = 'task-summary';
            summary.textContent = task.summary;
            card.appendChild(summary);
          }

          // Artifact links (upstream and downstream)
          const hasUpstream = task.upstream?.length > 0;
          const hasDownstream = task.downstream?.length > 0;
          if (hasUpstream || hasDownstream) {
            const artifactLinks = document.createElement('div');
            artifactLinks.className = 'artifact-links';
            if (hasUpstream) {
              task.upstream.forEach(artifact => {
                const badge = document.createElement('span');
                badge.className = 'artifact-badge upstream';
                badge.textContent = artifact;
                badge.title = 'Upstream: ' + artifact;
                artifactLinks.appendChild(badge);
              });
            }
            if (hasDownstream) {
              task.downstream.forEach(artifact => {
                const badge = document.createElement('span');
                badge.className = 'artifact-badge downstream';
                badge.textContent = artifact;
                badge.title = 'Downstream: ' + artifact;
                artifactLinks.appendChild(badge);
              });
            }
            card.appendChild(artifactLinks);
          }

          // Progress bar (if checklist exists)
          const total = task.checklistTotal || 0;
          const done = task.checklistDone || 0;
          if (total > 0) {
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            progressFill.style.width = Math.round((done / total) * 100) + '%';
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);
            const progressText = document.createElement('span');
            progressText.className = 'progress-text';
            progressText.textContent = done + '/' + total;
            progressContainer.appendChild(progressText);
            card.appendChild(progressContainer);
          }

          // Tags
          if (task.tags?.length) {
            const tags = document.createElement('div');
            tags.className = 'task-tags';
            tags.textContent = task.tags.join(', ');
            card.appendChild(tags);
          }

          // Footer: priority/date on left, status on right
          const status = task.status || 'todo';
          const hasStatus = status !== 'todo';
          const hasPriority = !!task.priority;
          const hasDate = !!task.updatedAt;
          
          if (hasStatus || hasPriority || hasDate) {
            const footer = document.createElement('div');
            footer.className = 'card-footer';
            
            // Left side: priority · date
            const footerLeft = document.createElement('div');
            footerLeft.className = 'card-footer-left';
            
            if (hasPriority) {
              const prioritySpan = document.createElement('span');
              prioritySpan.className = 'priority priority-' + task.priority;
              prioritySpan.textContent = task.priority;
              footerLeft.appendChild(prioritySpan);
            }
            
            if (hasPriority && hasDate) {
              const separator = document.createElement('span');
              separator.className = 'separator';
              separator.textContent = '·';
              footerLeft.appendChild(separator);
            }
            
            if (hasDate) {
              const dateSpan = document.createElement('span');
              dateSpan.className = 'date';
              const date = new Date(task.updatedAt);
              dateSpan.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              footerLeft.appendChild(dateSpan);
            }
            
            footer.appendChild(footerLeft);
            
            // Right side: status
            if (hasStatus) {
              const statusSpan = document.createElement('span');
              statusSpan.className = 'card-footer-right status-' + status;
              const statusLabels = {
                'in_progress': 'Active',
                'blocked': 'Blocked',
                'pending': 'Pending',
                'done': 'Done'
              };
              statusSpan.textContent = statusLabels[status] || status;
              footer.appendChild(statusSpan);
            }
            
            card.appendChild(footer);
          }

          return card;
        }

        function buildChips(task) {
          const chips = [];
          if (task.priority) {
            const priorityChip = createChip(task.priority, 'priority-' + task.priority);
            chips.push(priorityChip);
          }
          if (task.updatedAt) {
            const date = new Date(task.updatedAt);
            if (!isNaN(date.valueOf())) {
              chips.push(createChip(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })));
            }
          }
          return chips;
        }

        function createColumnAddButton(columnId) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'column-add-button';
          button.title = 'Create Task';
          button.textContent = '+';
          button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            vscode.postMessage({ type: 'createTask', columnId });
          });
          return button;
        }

        function createChip(text, extraClass) {
          const chip = document.createElement('span');
          chip.className = 'task-chip' + (extraClass ? ' ' + extraClass : '');
          chip.textContent = text;
          return chip;
        }

        function handleCardClick(event, taskId) {
          event.stopPropagation();
          const multi = event.shiftKey || event.metaKey || event.ctrlKey;
          if (multi) {
            if (state.selection.has(taskId)) {
              state.selection.delete(taskId);
            } else {
              state.selection.add(taskId);
            }
          } else if (!state.selection.has(taskId) || state.selection.size > 1) {
            state.selection.clear();
            state.selection.add(taskId);
          }
          persistState();
          renderBoard();
        }

        function handleDragStart(event, taskId, card) {
          const dragIds = state.selection.has(taskId) ? Array.from(state.selection) : [taskId];
          state.dragTaskIds = dragIds;
          card.classList.add('dragging');
          if (!state.selection.has(taskId)) {
            state.selection.clear();
            state.selection.add(taskId);
            persistState();
            renderBoard();
          }
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', dragIds.join(','));
            const preview = createDragPreview(dragIds.length);
            event.dataTransfer.setDragImage(preview, -10, -10);
            setTimeout(() => preview.remove(), 0);
          }
        }

        function createDragPreview(count) {
          const preview = document.createElement('div');
          preview.className = 'drag-preview';
          preview.textContent = count === 1 ? 'Moving 1 task' : 'Moving ' + count + ' tasks';
          document.body.appendChild(preview);
          return preview;
        }

        function handleDragEnd(card) {
          card.classList.remove('dragging');
          state.dragTaskIds = [];
        }

        function handleDragOver(event, columnEl) {
          event.preventDefault();
          event.dataTransfer && (event.dataTransfer.dropEffect = 'move');
          columnEl.classList.add('drop-target');
        }

        function handleDrop(event, columnId, columnEl) {
          event.preventDefault();
          columnEl.classList.remove('drop-target');
          if (!state.dragTaskIds.length) {
            const payload = event.dataTransfer?.getData('text/plain');
            if (payload) {
              state.dragTaskIds = payload.split(',').filter(Boolean);
            }
          }
          const taskIds = state.dragTaskIds.filter(Boolean);
          state.dragTaskIds = [];
          if (!taskIds.length) {
            return;
          }
          vscode.postMessage({ type: 'moveTasks', taskIds, columnId });
        }

        function updateSelectionBanner() {
          if (!state.selection.size) {
            selectionBanner.classList.add('hidden');
            return;
          }
          selectionBanner.classList.remove('hidden');
          selectionCount.textContent =
            state.selection.size === 1 ? '1 task selected' : state.selection.size + ' tasks selected';
        }

        function clearSelection() {
          if (!state.selection.size) {
            return;
          }
          state.selection.clear();
          persistState();
          renderBoard();
        }

        function openTask(taskId) {
          vscode.postMessage({ type: 'openTask', taskId });
        }

        boardEl?.addEventListener('click', (event) => {
          if (event.target === boardEl) {
            clearSelection();
          }
        });
        clearSelectionBtn?.addEventListener('click', clearSelection);
        
        // Add task button - triggers column selection
        const addTaskBtn = document.getElementById('addTaskBtn');
        addTaskBtn?.addEventListener('click', () => {
          vscode.postMessage({ type: 'createTask' });
        });
        
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            clearSelection();
          }
          // Delete selected tasks with Delete or Backspace key
          if ((event.key === 'Delete' || event.key === 'Backspace') && state.selection.size > 0) {
            const taskIds = Array.from(state.selection);
            vscode.postMessage({ type: 'deleteTasks', taskIds });
          }
        });

        window.addEventListener('message', (event) => {
          if (event?.data?.type === 'board') {
            updateBoard(event.data.data);
          }
        });

        vscode.postMessage({ type: 'ready' });
      })();
    </script>
  `;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${cspMeta}${styles}<style>${layoutStyles}</style></head>${body}${script}</html>`;
}
