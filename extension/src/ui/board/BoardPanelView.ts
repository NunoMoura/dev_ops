import * as vscode from 'vscode';
import { getFontLink, getSharedStyles, getCSPMeta } from '../shared/styles';
import { Board } from '../../common';
import { readTaskContext, writeTaskContext } from '../../services/board/boardPersistence';
import { boardService } from '../../services/board/boardService';

export type BoardViewColumn = {
  id: string;
  name: string;
  position?: number;
  wipLimit?: number;
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
  owner?: string;
  activeSession?: {
    agent: string;
    model: string;
    phase: string;
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

    const logoUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'resources', 'devops-logo.svg')
    );
    this.panel.webview.html = getBoardHtml(true, logoUri.toString()); // true = panel mode (full width)

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
        position: c.position,
        wipLimit: c.wipLimit
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
        owner: t.owner,
        activeSession: t.activeSession ? {
          agent: t.activeSession.agent,
          model: t.activeSession.model,
          phase: t.activeSession.phase
        } : undefined,
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

function getBoardHtml(panelMode = false, logoUri = ''): string {
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
        padding: 12px;
        background: var(--vscode-editor-background, rgba(0, 0, 0, 0.4));
        cursor: grab;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
        position: relative;
        border-left: 2px solid #6b7280; /* Default: grey */
      }
      .task-card:hover {
        border-color: var(--vscode-focusBorder, #3b82f6);
        background: var(--vscode-editor-background, rgba(0, 0, 0, 0.5));
      }
      /* Status-based left border colors */
      .task-card[data-status="todo"] { border-left-color: #6b7280; }
      .task-card[data-status="ready"] { border-left-color: #3b82f6; }
      .task-card[data-status="in_progress"], 
      .task-card[data-status="agent_active"] { border-left-color: #22c55e; }
      .task-card[data-status="needs_feedback"] { border-left-color: #eab308; }
      .task-card[data-status="blocked"] { border-left-color: #ef4444; }
      .task-card[data-status="done"] { border-left-color: #6b7280; opacity: 0.8; }

      .task-card.selected {
        border-color: var(--vscode-focusBorder);
        box-shadow: 0 0 0 1px var(--vscode-focusBorder);
      }
      .task-card.dragging {
        opacity: 0.5;
        cursor: grabbing;
      }
      .task-title {
        font-weight: 600;
        font-size: 13px;
        line-height: 1.3;
        color: var(--vscode-editor-foreground);
      }
      .task-summary {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        opacity: 0.8;
      }
      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.06));
      }
      .card-archive-button {
        border: 1px solid var(--vscode-button-background);
        border-radius: 4px;
        background: transparent;
        color: var(--vscode-foreground);
        padding: 2px 8px;
        font-size: 10px;
        cursor: pointer;
        margin-right: 8px;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      .card-archive-button:hover {
        opacity: 1;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      #empty-state {
        text-align: center;
        color: var(--vscode-descriptionForeground);
        margin-top: 48px;
        grid-column: 1 / -1;
      }
      .archive-all-button {
        width: 100%;
        padding: 8px;
        margin-top: 12px;
        background: transparent;
        border: 1px solid var(--vscode-button-background, #3b82f6);
        border-radius: 6px;
        color: var(--vscode-button-background, #3b82f6);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s ease;
        font-weight: 500;
        opacity: 0.8;
      }
      .archive-all-button:hover {
        background: var(--vscode-button-background, #3b82f6);
        color: var(--vscode-button-foreground, #ffffff);
        opacity: 1;
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
      .empty-state .code {
        font-family: var(--vscode-editor-font-family);
        background: var(--vscode-textCodeBlock-background);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.9em;
      }
      
      /* Info Button */
      .info-button {
        color: var(--vscode-descriptionForeground);
        opacity: 0.6;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        transition: opacity 0.2s, background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .info-button:hover {
        color: var(--vscode-textLink-foreground);
        opacity: 1;
        background: rgba(59, 130, 246, 0.1);
      }

      /* Details Popover */
      .details-popover {
        position: fixed;
        z-index: 1000;
        background: var(--vscode-editor-background, #1e1e1e);
        border: 1px solid #3b82f6; /* Premium blue border as in mockup */
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        padding: 14px;
        width: 260px;
        font-size: 13px;
        animation: fadeIn 0.1s ease-out;
        pointer-events: auto;
      }
      /* Tooltip Arrow */
      .details-popover::after {
        content: '';
        position: absolute;
        bottom: -6px;
        right: 20px;
        width: 10px;
        height: 10px;
        background: var(--vscode-editor-background, #1e1e1e);
        border-right: 1px solid #3b82f6;
        border-bottom: 1px solid #3b82f6;
        transform: rotate(45deg);
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .popover-row {
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .popover-row:last-child {
        margin-bottom: 0;
      }
      .popover-icon {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--vscode-descriptionForeground);
        opacity: 0.8;
      }
      .popover-label {
        color: var(--vscode-descriptionForeground);
        font-weight: 500;
        width: 55px;
        flex-shrink: 0;
      }
      .popover-value {
        color: var(--vscode-foreground);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .popover-overlay {
        position: fixed;
        top: 0; 
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999;
        background: transparent;
      }
      
      /* Badge Status Overrides for Footer */
      .status-badge {
        font-size: 10px;
        padding: 1px 8px;
        border-radius: 12px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
      }
      .status-badge.status-todo { background: rgba(107, 114, 128, 0.15); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.3); }
      .status-badge.status-ready { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
      .status-badge.status-in_progress { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
      .status-badge.status-needs_feedback { background: rgba(234, 179, 18, 0.15); color: #facd15; border: 1px solid rgba(234, 179, 8, 0.3); }
      .status-badge.status-blocked { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
      .status-badge.status-done { background: rgba(107, 114, 128, 0.1); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.2); opacity: 0.7; }
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
        const logoUri = '${logoUri}';
        const boardEl = document.getElementById('board');
        const emptyState = document.getElementById('empty-state');
        const selectionBanner = document.getElementById('selectionBanner');
        const selectionCount = document.getElementById('selectionCount');
        const clearSelectionBtn = document.getElementById('clearSelection');
        
        // Header Controls
        const searchInput = document.getElementById('search-input');

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
          filterText: ''
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
          
          state.filteredTasks = state.tasks.filter(task => {
            const matchesText = !text || 
                                task.title.toLowerCase().includes(text) || 
                                (task.summary && task.summary.toLowerCase().includes(text)) ||
                                (task.owner && task.owner.toLowerCase().includes(text));
            return matchesText;
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
                '<div class="icon"><img src="' + logoUri + '" alt="DevOps Logo" style="width: 64px; height: 64px;"></div>' +
                '<h3>Ready to Get Started</h3>' +
                '<p>Open the AI Chat and run <span class="code">/bootstrap</span> to analyze your codebase and generate tasks.</p>';
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
            
            const taskCount = columnTasks.length;
            const wipLimit = column.wipLimit;
            const isOverLimit = wipLimit !== undefined && taskCount >= wipLimit;

            if (wipLimit !== undefined) {
               // Smart WIP: Only show if over limit or explicitly requested (future).
               // User request: "only need to show the user when the wip was surpassed"
               if (isOverLimit) {
                  count.textContent = taskCount + ' / ' + wipLimit;
                  count.style.color = '#ef4444'; // Red
                  count.style.fontWeight = 'bold';
                  header.style.borderColor = '#ef4444'; 
               } else {
                  // If under limit, just show count? Or hide limit part?
                  // User: "don't need to have the wip always present". So just count.
                  count.textContent = String(taskCount);
                  header.style.borderColor = ''; 
               }
            } else {
               count.textContent = String(taskCount);
            }

headerContent.appendChild(count);

header.appendChild(headerContent);

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
if (column.id === 'col-done' && columnTasks.length > 0) {
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
  card.dataset.status = task.status || 'todo';
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

  // Card Header: ID + Title
  const header = document.createElement('div');
  header.className = 'card-header';
  header.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;';

  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title;
  title.style.marginBottom = '0'; // Override generic style
  header.appendChild(title);

  const idBadge = document.createElement('div');
  idBadge.className = 'task-id-badge';
  idBadge.textContent = task.id;
  idBadge.style.cssText = 'font-size:10px; color:var(--vscode-descriptionForeground); margin-left:8px; white-space:nowrap; opacity:0.7;';
  header.appendChild(idBadge);

  card.appendChild(header);

  // Summary (Description)
  if (task.summary) {
    const summary = document.createElement('div');
    summary.className = 'task-summary';
    summary.textContent = task.summary;
    card.appendChild(summary);
  }

  /* Removed: Upstream/Downstream artifacts, Progress Bars */

  // Footer: Status (Left) + Info Button (Right) - Matching Mockup
  const status = task.status || 'ready';
  
  const footer = document.createElement('div');
  footer.className = 'card-footer';
  footer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:8px; border-top: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.05));';

  // Left side: Status Badge
  const footerLeft = document.createElement('div');
  const statusSpan = document.createElement('span');
  statusSpan.className = 'status-badge status-' + (status === 'agent_active' ? 'in_progress' : status);
  
  const statusLabels = {
    'todo': 'Todo',
    'ready': 'Ready',
    'in_progress': 'In Progress',
    'agent_active': 'In Progress',
    'needs_feedback': 'Feedback',
    'blocked': 'Blocked',
    'done': 'Done'
  };
  statusSpan.textContent = statusLabels[status] || status;
  footerLeft.appendChild(statusSpan);
  footer.appendChild(footerLeft);

  // Right side: Info Button (Always visible)
  const footerRight = document.createElement('div');
  footerRight.style.display = 'flex';
  footerRight.style.alignItems = 'center';
  
  const infoBtn = document.createElement('button');
  infoBtn.className = 'icon-button info-button';
  infoBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7.5 7v4h1V7h-1zM8 6a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z"/></svg>';
  infoBtn.title = 'View Details';
  
  infoBtn.onclick = (e) => {
    e.stopPropagation();
    const rect = infoBtn.getBoundingClientRect();
    showTaskDetailsPopover(task, rect.left, rect.top); // Show above
  };
  
  footerRight.appendChild(infoBtn);

  if (columnId === 'col-done' || status === 'done') {
    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'card-archive-button';
    archiveBtn.textContent = 'Archive';
    archiveBtn.onclick = (e) => {
      e.stopPropagation();
      vscode.postMessage({ type: 'archiveTask', taskId: task.id });
    };
    footerRight.prepend(archiveBtn);
  }

  footer.appendChild(footerRight);
  card.appendChild(footer);

  return card;
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

// --- Filter Listeners ---
searchInput?.addEventListener('input', (e) => {
  state.filterText = e.target.value;
  updateBoard({ columns: state.columns, tasks: state.tasks }); // Trigger re-filter
});



// --- Popover Logic ---
function showTaskDetailsPopover(task, x, y) {
    // Remove existing
    const existing = document.getElementById('details-popover-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'details-popover-container';

    // Overlay to close
    const overlay = document.createElement('div');
    overlay.className = 'popover-overlay';
    overlay.onclick = () => container.remove();
    container.appendChild(overlay);

    const popover = document.createElement('div');
    popover.className = 'details-popover';
    
    // Position: Above the button
    popover.style.left = Math.max(10, Math.min(x - 220, window.innerWidth - 275)) + 'px';
    popover.style.top = (y - 135) + 'px'; 

    // Tooltip icons
    const iconOwner = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0-2.21-1.79-4-4-4H6c-2.21 0-4 1.79-4 4v1h12v-1zM3.07 13c.34-1.14 1.38-2 2.6-2h4.66c1.22 0 2.26.86 2.6 2H3.07z"/></svg>';
    const iconAgent = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11 3H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM5 4h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M6 7h1v1H6zM9 7h1v1H9zM6 10h4v1H6z"/></svg>';
    const iconModel = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a5 5 0 0 0-5 5c0 1.2.4 2.3 1.1 3.2C3.5 10.1 3 11 3 12c0 1.6 1.3 3 3 3h4c1.7 0 3-1.4 3-3 0-1-.5-1.9-1.1-2.8.7-.9 1.1-2 1.1-3.2a5 5 0 0 0-5-5zM6 14c-1.1 0-2-.9-2-2 0-.7.3-1.3.8-1.7l.5-.4-.1-.6C5.1 8.7 5 8 5 7.4 5 5.5 6.3 4 8 4s3 1.5 3 3.4c0 .6-.1 1.3-.2 1.9l-.1.6.5.4c.5.4.8 1 .8 1.7 0 1.1-.9 2-2 2H6z"/></svg>';

    // Values with fallbacks
    const ownerName = task.owner || 'Unassigned';
    const agentName = task.activeSession?.agent || 'None';
    const modelName = task.activeSession?.model || 'None';

    popover.innerHTML = 
        '<div class="popover-row">' +
            '<span class="popover-icon">' + iconOwner + '</span>' +
            '<span class="popover-label">Owner:</span>' +
            '<span class="popover-value">👤 ' + ownerName + '</span>' +
        '</div>' +
        '<div class="popover-row">' +
            '<span class="popover-icon">' + iconAgent + '</span>' +
            '<span class="popover-label">Agent:</span>' +
            '<span class="popover-value">🤖 ' + agentName + '</span>' +
        '</div>' +
        '<div class="popover-row">' +
            '<span class="popover-icon">' + iconModel + '</span>' +
            '<span class="popover-label">Model:</span>' +
            '<span class="popover-value">🧠 ' + modelName + '</span>' +
        '</div>';

    container.appendChild(popover);
    document.body.appendChild(container);

    // Close on Escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        container.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
}

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
  if ((event.key === 'Delete' || event.key === 'Backspace') && state.selection.size > 0 && !modal.open) {
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
  if (rect.right > window.innerWidth) {
    contextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
  }
  if (rect.bottom > window.innerHeight) {
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
  if (contextTask) openEditModal(contextTask);
  hideContextMenu();
});

ctxArchive?.addEventListener('click', () => {
  if (contextTask) vscode.postMessage({ type: 'archiveTask', taskId: contextTask });
  hideContextMenu();
});

// Priority Handlers
['high', 'medium', 'low'].forEach(p => {
  const el = document.getElementById('ctx-priority-' + p);
  el?.addEventListener('click', () => {
    if (contextTask) {
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
    if (searchInput) searchInput.value = '';
    if (priorityFilter) priorityFilter.value = '';
    state.filterText = '';
    state.filterPriority = '';
    updateBoard({ columns: state.columns, tasks: state.tasks });
  }
});

vscode.postMessage({ type: 'ready' });
      }) ();
</script>
  `;

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    ${cspMeta}
    ${fontLink}
    ${sharedStyles}
    ${styles}
    <style>${layoutStyles}</style>
  </head>
  ${body}
  ${script}
  </html>`;
}
