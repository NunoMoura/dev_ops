import * as vscode from 'vscode';
import { getFontLink, getSharedStyles, getCSPMeta } from '../shared/styles';
import { Board } from '../../core';
import { readTaskContext, writeTaskContext, boardService } from '../../data';

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
  columnName?: string;
  priority?: string;
  status?: string;
  tags?: string[];
  updatedAt?: string;
  owner?: {
    developer?: string;
    agent?: string;
    type?: string;
  };
  upstream?: string[];
  downstream?: string[];
  checklistTotal?: number;
  checklistDone?: number;
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
  | { type: 'deleteTasks'; taskIds: string[] }
  | { type: 'archiveTasks' }
  | { type: 'archiveTask'; taskId: string }
  | { type: 'copyHandoffCommand'; taskId: string }
  | { type: 'viewWalkthrough'; taskId: string }
  | { type: 'getTaskContext'; taskId: string }
  | { type: 'saveTaskContext'; taskId: string; content: string }
  | { type: 'updateTask'; taskId: string; updates: any };

type WebviewEvent =
  | { type: 'board'; data: BoardViewSnapshot }
  | { type: 'taskContext'; taskId: string; content: string };

export class BoardPanelManager {
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

  private readonly onViewStateChangeEmitter = new vscode.EventEmitter<boolean>();
  readonly onDidViewStateChange = this.onViewStateChangeEmitter.event;

  private readonly onArchiveEmitter = new vscode.EventEmitter<void>();
  readonly onDidRequestArchiveTasks = this.onArchiveEmitter.event;

  private readonly onArchiveSingleEmitter = new vscode.EventEmitter<string>();
  readonly onDidRequestArchiveTask = this.onArchiveSingleEmitter.event;

  public isPanelOpen(): boolean {
    return !!this.panel;
  }

  constructor(private readonly extensionUri: vscode.Uri) { }

  /**
   * Opens the Board board in an editor panel (draggable to second monitor).
   * If already open, reveals the existing panel.
   */
  openBoard(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'boardBoard',
      'DevOps Board',
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
      this.onViewStateChangeEmitter.fire(false);
    });

    // Notify listeners that panel is open
    this.onViewStateChangeEmitter.fire(true);

    this.panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (!message) {
        return;
      }
      if (message.type === 'ready') {
        this.webviewReady = true;
        this.postBoard();
      } else if (message.type === 'updateTask' && typeof message.taskId === 'string' && message.updates) {
        await boardService.updateTask(message.taskId, message.updates);
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
      } else if (message.type === 'archiveTasks') {
        // Handle archive all request
        this.archiveAllDone();
      } else if (message.type === 'archiveTask' && typeof message.taskId === 'string') {
        // Handle individual task archive
        this.onArchiveSingleEmitter.fire(message.taskId);
      } else if (message.type === 'copyHandoffCommand' && typeof message.taskId === 'string') {
        // Copy handoff command to clipboard
        const command = `/pick_task ${message.taskId}`;
        vscode.env.clipboard.writeText(command);
        vscode.window.showInformationMessage(`Command copied: ${command}`);
      } else if (message.type === 'viewWalkthrough' && typeof message.taskId === 'string') {
        // Open walkthrough for task
        vscode.commands.executeCommand('devops.viewWalkthrough', message.taskId);
      } else if (message.type === 'getTaskContext' && typeof message.taskId === 'string') {
        const content = await readTaskContext(message.taskId);
        this.panel?.webview.postMessage({ type: 'taskContext', taskId: message.taskId, content });
      } else if (message.type === 'saveTaskContext' && typeof message.taskId === 'string' && typeof message.content === 'string') {
        await writeTaskContext(message.taskId, message.content);
      }
    });

    this.postBoard();
  }

  private async archiveAllDone(): Promise<void> {
    this.onArchiveEmitter.fire();
  }

  setBoard(board: BoardViewSnapshot | undefined): void {
    this.latestBoard = board ?? { columns: [], tasks: [] };
    this.postBoard();
  }

  public updateFromBoard(board: Board): void {
    const snapshot: BoardViewSnapshot = {
      columns: board.columns.map(c => ({
        id: c.id,
        name: c.name,
        position: c.position
      })),
      tasks: board.items.map(t => ({
        id: t.id,
        columnId: t.columnId,
        title: t.title,
        summary: t.summary,
        columnName: board.columns.find(c => c.id === t.columnId)?.name,
        priority: t.priority,
        status: t.status,
        tags: t.tags,
        updatedAt: t.updatedAt,
        owner: t.owner, // Assumes type compatibility
        upstream: t.upstream,
        downstream: t.downstream,
        checklistTotal: t.checklist?.length,
        checklistDone: t.checklist?.filter(i => i.done).length
      }))
    };
    this.setBoard(snapshot);
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

export function createBoardPanelManager(context: vscode.ExtensionContext): BoardPanelManager {
  const manager = new BoardPanelManager(context.extensionUri);

  // Register command to open board in editor panel
  context.subscriptions.push(
    vscode.commands.registerCommand('devops.openBoard', () => {
      manager.openBoard();
    }),
  );

  return manager;
}

function getBoardHtml(panelMode = false): string {
  // Use shared design system
  const cspMeta = getCSPMeta();
  const fontLink = getFontLink();
  const sharedStyles = getSharedStyles();

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

      .context-menu {
        position: fixed;
        background: var(--vscode-menu-background);
        color: var(--vscode-menu-foreground);
        border: 1px solid var(--vscode-menu-border);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        border-radius: 4px;
        z-index: 1000;
        padding: 4px 0;
        min-width: 180px;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
      }
      .context-menu.hidden {
        display: none;
      }
      .menu-item {
        padding: 6px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .menu-item:hover {
        background: var(--vscode-menu-selectionBackground);
        color: var(--vscode-menu-selectionForeground);
      }
      .menu-separator {
        height: 1px;
        background: var(--vscode-menu-separatorBackground);
        margin: 4px 0;
      }
    `;

  const styles = /* HTML */ `
    <style>
      :root {
        color-scheme: var(--vscode-colorScheme);
        --brand-gradient: linear-gradient(135deg, #0d9488 0%, #4f46e5 100%);
        --brand-teal: #0d9488;
      }
      body {
        font-family: 'IBM Plex Sans', var(--vscode-font-family), sans-serif;
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
        padding: 12px 16px;
        border-bottom: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.08));
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.02);
      }
      .column-title {
        flex: 1;
        margin-right: 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 11px;
        color: var(--vscode-editor-foreground);
        font-weight: 500;
        opacity: 0.9;
      }
      .column-title::before {
        content: '▸ '; /* Native-looking chevron */
        opacity: 0.7;
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
        border-left: 2px solid #6b7280; /* Default: ready/done gray */
      }
      /* Status-based left border colors for agent-human handoff */
      .task-card[data-status="ready"] { border-left-color: #3b82f6; } /* Blue: spawn agent */
      .task-card[data-status="agent_active"] { border-left-color: #22c55e; } /* Green: agent working */
      .task-card[data-status="needs_feedback"] { border-left-color: #f97316; } /* Orange: user action needed */
      .task-card[data-status="blocked"] { border-left-color: #ef4444; } /* Red: blocked */
      .task-card[data-status="done"] { border-left-color: #6b7280; } /* Gray: complete */
      .task-card.selected {
        border-color: var(--vscode-focusBorder);
        border-left-width: 2px;
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
        font-weight: 500; /* Reduced from 600 */
        font-size: 13px;
        line-height: 1.3;
        margin-bottom: 4px;
        color: var(--vscode-editor-foreground);
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
        background: rgba(20, 184, 166, 0.15);
        border: 1px solid rgba(20, 184, 166, 0.3);
        border-radius: 4px;
        padding: 1px 5px;
        font-size: 9px;
        color: #5b72e8;
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
        background: var(--brand-gradient);
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
      .card-footer-left .priority-high,
      .card-footer-left .priority-medium,
      .card-footer-left .priority-low {
        color: var(--vscode-descriptionForeground);
        opacity: 0.9;
      }
      .card-footer-left .owner-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(255, 255, 255, 0.08);
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 10px;
        color: var(--vscode-foreground);
        opacity: 0.9;
      }
      .card-footer-left .agent-badge {
        color: #22c55e; /* Green for active agent */
      }
      .card-footer-left .date {
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.05em;
      }
      .card-footer-left .separator { opacity: 0.4; }
      .card-footer-right {
        text-transform: capitalize;
      }
      .card-footer-right.status-ready { color: #3b82f6; }
      .card-footer-right.status-agent_active { color: #22c55e; }
      .card-footer-right.status-needs_feedback { color: #f97316; }
      .card-footer-right.status-blocked { color: #ef4444; }
      .card-footer-right.status-done { color: #6b7280; }
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
      .archive-all-button {
        width: 100%;
        padding: 10px;
        margin-top: 8px;
        background: transparent;
        border: 1px solid var(--brand-color);
        border-radius: 6px;
        color: var(--brand-color);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .archive-all-button:hover {
        background: var(--brand-color);
        color: var(--vscode-sideBar-background);
        border-style: solid;
      }
      .card-archive-button {
        border: 1px solid var(--brand-color);
        border-radius: 4px;
        background: transparent;
        color: var(--brand-color);
        padding: 4px 10px;
        font-size: 11px;
        cursor: pointer;
        margin-left: 6px;
      }
      .card-archive-button:hover {
        background: var(--brand-color);
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
        border: 1px solid var(--brand-color);
        border-radius: 4px;
        background: transparent;
        color: var(--brand-color);
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
      }
      button.ghost:hover {
        background: rgba(255,255,255,0.1);
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
        margin-bottom: 16px;
        min-height: 28px; /* Force consistent height for alignment with Dashboard */
        /* Consistent separator to match Dashboard and Columns */
        border-bottom: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.08));
      }
      .board-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--vscode-foreground);
      }

      .add-task-button {
        padding: 6px 14px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 2px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.1s;
        font-family: inherit;
        text-transform: none;
        font-size: 11px;
        position: relative;
        box-shadow: none;
      }
      .add-task-button:hover {
        background: var(--vscode-button-hoverBackground);
      }
      
      /* Header Controls */
      .header-controls {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .search-box {
        position: relative;
        display: flex;
        align-items: center;
      }
      .search-box input {
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        padding: 4px 8px 4px 24px;
        font-family: inherit;
        font-size: 11px;
        width: 180px;
        outline: none;
      }
      .search-box input:focus {
        border-color: var(--vscode-focusBorder);
      }
      .search-box .codicon-search {
        position: absolute;
        left: 6px;
        font-size: 12px;
        color: var(--vscode-input-placeholderForeground);
        pointer-events: none;
      }
      select {
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        border: 1px solid var(--vscode-dropdown-border);
        border-radius: 4px;
        padding: 4px;
        font-family: inherit;
        font-size: 11px;
        outline: none;
      }
      
      /* Modal */
      dialog {
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        padding: 0;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 4px 24px rgba(0,0,0,0.5);
      }
      dialog::backdrop {
        background: rgba(0,0,0,0.5);
      }
      .modal-content {
        display: flex;
        flex-direction: column;
        height: 60vh;
      }
      .modal-header {
        padding: 12px 16px;
        border-bottom: 1px solid var(--vscode-panel-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .modal-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }
      .icon-button {
        background: transparent;
        border: none;
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
        padding: 4px;
        font-size: 14px;
      }
      .icon-button:hover {
        color: var(--vscode-foreground);
      }
      .modal-body {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
      }
      .modal-section label {
        display: block;
        font-weight: 600;
        font-size: 11px;
        margin-bottom: 8px;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
      }
      .markdown-editor-container {
        height: 300px;
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        overflow: hidden;
      }
      textarea {
        width: 100%;
        height: 100%;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: none;
        padding: 8px;
        font-family: var(--vscode-editor-font-family);
        font-size: var(--vscode-editor-font-size);
        resize: none;
        outline: none;
      }
      .modal-actions {
        padding: 12px 16px;
        border-top: 1px solid var(--vscode-panel-border);
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .primary-button {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 6px 12px;
        border-radius: 2px;
        cursor: pointer;
      }
      .primary-button:hover {
        background: var(--vscode-button-hoverBackground);
      }
      .modal-hint {
        margin-top: 6px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        opacity: 0.8;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: var(--vscode-descriptionForeground);
        text-align: center;
        height: 100%;
        min-height: 300px;
      }
      .empty-state .icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
        line-height: 1;
      }
      .empty-state h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        color: var(--vscode-foreground);
        font-weight: 500;
      }
      .empty-state p {
        margin: 0 0 24px 0;
        max-width: 400px;
        font-size: 14px;
        line-height: 1.5;
      }
      .empty-state .cta-button {
        padding: 8px 16px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 2px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .empty-state .cta-button:hover {
        background: var(--vscode-button-hoverBackground);
      }
    </style>
  `;

  const body = /* HTML */ `
    <body>
      <div class="board-wrapper">
        <div class="board-header">
          <div class="header-left">
             <h2 class="board-title">DevOps Board</h2>
          </div>
          <div class="header-controls">
            <div class="search-box">
             <span class="codicon codicon-search"></span>
              <input type="text" id="search-input" placeholder="Search tasks..." />
            </div>
            <select id="priority-filter">
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
           <span class="separator"></span>
            <button id="addTaskBtn" class="add-task-button" type="button" title="Create Task">
             <span class="codicon codicon-plus"></span> New Task
            </button>
          </div>
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
        <div id="empty-state" class="empty-state hidden"></div>
        
        <!-- Edit Task Modal -->
        <dialog id="edit-modal">
          <form method="dialog" class="modal-content">
            <div class="modal-header">
              <h3 id="modal-title">Edit Task</h3>
              <button id="modal-close" class="icon-button">✕</button>
            </div>
            <div class="modal-body">
              <div class="modal-section">
                <label>Context & Decisions</label>
                <div class="markdown-editor-container">
                  <textarea id="modal-context-editor" placeholder="Record design decisions, context, and notes here... (Markdown supported)"></textarea>
                </div>
                <div class="modal-hint">Changes are saved automatically when you close or click Save.</div>
              </div>
            </div>
            <div class="modal-actions">
               <button id="modal-save" type="submit" class="primary-button">Save & Close</button>
            </div>
          </form>
        </dialog>

        <!-- Context Menu -->
        <div id="context-menu" class="context-menu hidden">
          <div class="menu-item" id="ctx-edit">Edit Task...</div>
          <div class="menu-separator"></div>
          <div class="menu-item" id="ctx-priority-high">Set Priority: High</div>
          <div class="menu-item" id="ctx-priority-medium">Set Priority: Medium</div>
          <div class="menu-item" id="ctx-priority-low">Set Priority: Low</div>
          <div class="menu-separator"></div>
          <div class="menu-item" id="ctx-archive">Archive</div>
        </div>
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
        
        // Header Controls
        const searchInput = document.getElementById('search-input');
        const priorityFilter = document.getElementById('priority-filter');

        // Modal Elements
        const modal = document.getElementById('edit-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalClose = document.getElementById('modal-close');
        const modalContextEditor = document.getElementById('modal-context-editor');
        const modalSave = document.getElementById('modal-save');
        let currentEditingTaskId = null;

        const savedState = vscode.getState() || {};
        const state = {
          columns: [],
          tasks: [],
          filteredTasks: [],
          selection: new Set(Array.isArray(savedState.selection) ? savedState.selection : []),
          dragTaskIds: [],
          filterText: '',
          filterPriority: ''
        };

        function persistState() {
          vscode.setState({ selection: Array.from(state.selection) });
        }

        function updateBoard(snapshot) {
          state.columns = Array.isArray(snapshot?.columns) ? snapshot.columns : [];
          state.tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : [];
          applyFilters();
          pruneSelection();
          renderBoard();
        }

        function applyFilters() {
          const text = state.filterText.toLowerCase();
          const priority = state.filterPriority;
          
          state.filteredTasks = state.tasks.filter(task => {
            const matchesText = !text || 
                                task.title.toLowerCase().includes(text) || 
                                (task.summary && task.summary.toLowerCase().includes(text)) ||
                                (task.owner && task.owner.developer && task.owner.developer.toLowerCase().includes(text));
            const matchesPriority = !priority || task.priority === priority;
            return matchesText && matchesPriority;
          });
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
          const displayTasks = state.filteredTasks;
          
          if (!state.columns.length) {
            emptyState.classList.remove('hidden');
            emptyState.innerHTML = 
                '<div class="icon">⚠️</div>' +
                '<h3>No Board Configuration</h3>' +
                '<p>The board configuration could not be loaded.</p>';
          } else if (state.tasks.length > 0 && displayTasks.length === 0) {
             emptyState.classList.remove('hidden');
             emptyState.innerHTML = 
                '<div class="icon">🔍</div>' +
                '<h3>No Matches Found</h3>' +
                '<p>Try adjusting your search or priority filters.</p>' +
                '<button class="cta-button cta-clear">Clear Filters</button>';
          } else if (state.tasks.length === 0) {
             emptyState.classList.remove('hidden');
             emptyState.innerHTML = 
                '<div class="icon">📋</div>' +
                '<h3>Welcome to DevOps Board</h3>' +
                '<p>Track your agent tasks, decisions, and progress in one place.</p>' +
                '<button class="cta-button cta-create"><span class="codicon codicon-plus"></span> Create First Task</button>';
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
            
            // Header Content
            const headerContent = document.createElement('div');
            headerContent.style.flex = '1';
            headerContent.style.display = 'flex';
            headerContent.style.alignItems = 'center';

            const title = document.createElement('span');
            title.className = 'column-title';
            title.textContent = column.name;
            headerContent.appendChild(title);
            
            const columnTasks = displayTasks.filter(t => t.columnId === column.id);
            
            const count = document.createElement('span');
            count.className = 'column-count';
            count.textContent = String(columnTasks.length);
            headerContent.appendChild(count);
            
            header.appendChild(headerContent);
            
            // Add button in header
            const addBtn = createColumnAddButton(column.id);
            header.appendChild(addBtn);

            columnEl.appendChild(header);

            const list = document.createElement('div');
            list.className = 'task-list';
            list.addEventListener('dragover', (event) => handleDragOver(event, columnEl));
            list.addEventListener('drop', (event) => handleDrop(event, column.id, columnEl));
            
            columnTasks.forEach((task) => {
              const card = renderTaskCard(task, column.id);
              list.appendChild(card);
            });
            
            // Add Archive All button after cards in Done column
            if (column.id === 'col-done' && columnTasks.length >0) {
                const archiveAllBtn = document.createElement('button');
                archiveAllBtn.className = 'archive-all-button';
                archiveAllBtn.textContent = 'Archive All';
                archiveAllBtn.onclick = () => {
                    vscode.postMessage({ type: 'archiveTasks' });
                };
                list.appendChild(archiveAllBtn);
            }
            
            columnEl.appendChild(list);
            boardEl.appendChild(columnEl);
          });
          updateSelectionBanner();
        }

        function renderTaskCard(task, columnId) {
          const card = document.createElement('article');
          card.className = 'task-card';
          card.draggable = true;
          card.dataset.taskId = task.id;
          card.dataset.status = task.status || 'ready';
          if (state.selection.has(task.id)) {
            card.classList.add('selected');
          }
          // Single click selects
          card.addEventListener('click', (event) => handleCardClick(event, task.id));
          // Context menu opens Edit Modal (Custom)
          card.addEventListener('contextmenu', (event) => {
             showContextMenu(event, task.id);
          });
          // Double click opens task in editor (Standard)
          card.addEventListener('dblclick', () => {
             vscode.postMessage({ type: 'openTask', taskId: task.id });
          });
          
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
          const hasUpstream = task.upstream?.length >0;
          const hasDownstream = task.downstream?.length >0;
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
          if (total >0) {
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

          // Footer: Priority, Owner, Date on left; Status on right
          const status = task.status || 'ready';
          const hasStatus = status !== 'ready';
          const hasPriority = !!task.priority;
          const hasDate = !!task.updatedAt;
          const hasOwner = !!(task.owner && task.owner.developer);

          if (hasStatus || hasPriority || hasDate || hasOwner) {
            const footer = document.createElement('div');
            footer.className = 'card-footer';
            
            // Left side
            const footerLeft = document.createElement('div');
            footerLeft.className = 'card-footer-left';
            
            // Priority
            if (hasPriority) {
              const prioritySpan = document.createElement('span');
              prioritySpan.className = 'priority priority-' + (task.priority.toLowerCase() || 'medium');
              prioritySpan.textContent = task.priority;
              footerLeft.appendChild(prioritySpan);
            }

            // Separator 1
            if (hasPriority && (hasOwner || hasDate)) {
               const sep = document.createElement('span');
               sep.className = 'separator';
               sep.textContent = '·';
               footerLeft.appendChild(sep);
            }

            // Owner
            if (hasOwner) {
                const ownerBadge = document.createElement('span');
                ownerBadge.className = 'owner-badge';
                ownerBadge.title = 'Developer: ' + task.owner.developer;
                ownerBadge.textContent = '👤 ' + task.owner.developer;
                footerLeft.appendChild(ownerBadge);

                // Agent
                if (task.owner.agent) {
                    const agentBadge = document.createElement('span');
                    agentBadge.className = 'owner-badge agent-badge';
                    agentBadge.title = 'Agent Activity: ' + task.owner.agent;
                    agentBadge.textContent = '🤖'; // Minimal badge
                    footerLeft.appendChild(agentBadge);
                }
            }

            // Separator 2
            if (hasOwner && hasDate) {
               const sep = document.createElement('span');
               sep.className = 'separator';
               sep.textContent = '·';
               footerLeft.appendChild(sep);
            }
            
            // Date
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
                'ready': 'Ready',
                'agent_active': 'In Progress',
                'needs_feedback': 'Feedback',
                'blocked': 'Blocked',
                'done': 'Done'
              };
              statusSpan.textContent = statusLabels[status] || status;
              footer.appendChild(statusSpan);
            }
            
            card.appendChild(footer);
          }
          // Actions row for Done tasks
          if (columnId === 'col-done') {
            const actionsRow = document.createElement('div');
            actionsRow.className = 'card-actions';
            const archiveBtn = document.createElement('button');
            archiveBtn.className = 'card-archive-button';
            archiveBtn.textContent = 'Archive';
            archiveBtn.onclick = (e) => {
              e.stopPropagation();
              vscode.postMessage({ type: 'archiveTask', taskId: task.id });
            };
            actionsRow.appendChild(archiveBtn);
            card.appendChild(actionsRow);
          }

          return card;
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
          } else if (!state.selection.has(taskId) || state.selection.size >1) {
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

        // --- Filter Listeners ---
        searchInput?.addEventListener('input', (e) => {
           state.filterText = e.target.value;
           updateBoard({ columns: state.columns, tasks: state.tasks }); // Trigger re-filter
        });
        
        priorityFilter?.addEventListener('change', (e) => {
           state.filterPriority = e.target.value;
           updateBoard({ columns: state.columns, tasks: state.tasks }); // Trigger re-filter
        });

        // --- Modal Logic ---
        function openEditModal(taskId) {
           currentEditingTaskId = taskId;
           const task = state.tasks.find(t => t.id === taskId);
           modalTitle.textContent = task ? 'Edit Task: ' + task.title : 'Edit Task';
           modalContextEditor.value = 'Loading context...';
           
           modal.showModal();
           
           // Fetch Context
           vscode.postMessage({ type: 'getTaskContext', taskId });
        }
        
        function closeEditModal() {
           modal.close();
           currentEditingTaskId = null;
        }
        
        function saveContext() {
           if (currentEditingTaskId) {
              const content = modalContextEditor.value;
              vscode.postMessage({ type: 'saveTaskContext', taskId: currentEditingTaskId, content });
              closeEditModal();
           }
        }
        
        modalClose?.addEventListener('click', closeEditModal);
        modalSave?.addEventListener('click', (e) => {
           e.preventDefault();
           saveContext();
        });
        
        // --- Event Listeners ---

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
            if (modal.open) {
                closeEditModal();
            } else {
                clearSelection();
            }
          }
          // Delete selected tasks with Delete or Backspace key
          if ((event.key === 'Delete' || event.key === 'Backspace') && state.selection.size >0 && !modal.open) {
            const taskIds = Array.from(state.selection);
            vscode.postMessage({ type: 'deleteTasks', taskIds });
          }
        });

        window.addEventListener('message', (event) => {
          if (event?.data?.type === 'board') {
            updateBoard(event.data.data);
          } else if (event?.data?.type === 'taskContext') {
             // Handle context load
             if (currentEditingTaskId === event.data.taskId && modal.open) {
                 modalContextEditor.value = event.data.content || '';
             }
          }
        });

        // --- Context Menu Logic ---
        const contextMenu = document.getElementById('context-menu');
        const ctxEdit = document.getElementById('ctx-edit');
        const ctxArchive = document.getElementById('ctx-archive');
        let contextTask = null;

        function showContextMenu(event, taskId) {
           event.preventDefault();
           contextTask = taskId;
           
           // Position
           const { clientX: mouseX, clientY: mouseY } = event;
           contextMenu.style.top = mouseY + 'px';
           contextMenu.style.left = mouseX + 'px';
           contextMenu.classList.remove('hidden');
           
           // Adjust if out of bounds (basic)
           const rect = contextMenu.getBoundingClientRect();
           if (rect.right >window.innerWidth) {
               contextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
           }
           if (rect.bottom >window.innerHeight) {
               contextMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';
           }
        }

        function hideContextMenu() {
           contextMenu.classList.add('hidden');
           contextTask = null;
        }

        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                hideContextMenu();
            }
        });

        document.addEventListener('contextmenu', (e) => {
            if (!contextMenu.contains(e.target)) {
                 hideContextMenu();
            }
        });
        
        ctxEdit?.addEventListener('click', () => {
             if(contextTask) openEditModal(contextTask);
             hideContextMenu();
        });
        
        ctxArchive?.addEventListener('click', () => {
             if(contextTask) vscode.postMessage({ type: 'archiveTask', taskId: contextTask });
             hideContextMenu();
        });

        // Priority Handlers
        ['high', 'medium', 'low'].forEach(p => {
             const el = document.getElementById('ctx-priority-' + p);
             el?.addEventListener('click', () => {
                 if(contextTask) {
                     vscode.postMessage({ 
                        type: 'updateTask', 
                        taskId: contextTask, 
                        updates: { priority: p.charAt(0).toUpperCase() + p.slice(1) } 
                     });
                 }
                 hideContextMenu();
             });
        });

        // Empty State Handler
        emptyState?.addEventListener('click', (e) => {
            const target = e.target;
            if (target.closest('.cta-create')) {
                vscode.postMessage({ type: 'createTask' });
            }
            if (target.closest('.cta-clear')) {
                 if(searchInput) searchInput.value = '';
                 if(priorityFilter) priorityFilter.value = '';
                 state.filterText = '';
                 state.filterPriority = '';
                 updateBoard({ columns: state.columns, tasks: state.tasks });
            }
        });

        vscode.postMessage({ type: 'ready' });
      })();
    </script>
  `;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${cspMeta}${fontLink}${sharedStyles}${styles}<style>${layoutStyles}</style></head>${body}${script}</html>`;
}
