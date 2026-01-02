import * as vscode from 'vscode';
import { Board, Task } from '../features/types';

/**
 * Board Overview Provider - Shows high-level metrics and active agents
 * 
 * Displays:
 * - Task counts by phase
 * - Active agent sessions
 * - Blocked tasks count
 * - Quick action buttons
 */
export class BoardOverviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'devopsBoardOverview';

  private _view?: vscode.WebviewView;
  private _board?: Board;

  constructor(
    private readonly _extensionUri: vscode.Uri
  ) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'createTask':
          await vscode.commands.executeCommand('devops.createTask');
          break;
        case 'spawnAgent':
          await vscode.commands.executeCommand('devops.spawnAgent');
          break;
      }
    });
  }

  public updateBoard(board: Board) {
    this._board = board;
    if (this._view) {
      this._view.webview.postMessage({ type: 'updateBoard', board });
    }
  }

  public refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const board = this._board;

    // Calculate metrics
    const metrics = this._calculateMetrics(board);
    const activeAgents = this._getActiveAgents(board);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Board Overview</title>
  <style>
    body {
      padding: 10px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px;
      margin-bottom: 4px;
    }
    .phase-name {
      color: var(--vscode-foreground);
    }
    .task-count {
      color: var(--vscode-descriptionForeground);
      text-align: right;
    }
    .agent {
      display: flex;
      align-items: center;
      padding: 4px 0;
      gap: 8px;
    }
    .agent-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .agent-status.active {
      background-color: var(--vscode-testing-iconPassed);
    }
    .agent-status.idle {
      background-color: var(--vscode-descriptionForeground);
    }
    .agent-info {
      flex: 1;
    }
    .agent-name {
      font-weight: 500;
    }
    .agent-task {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .quick-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    button {
      flex: 1;
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .blocker-count {
      color: var(--vscode-errorForeground);
      font-weight: bold;
    }
    .empty-state {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="section">
    <div class="section-title">📊 Tasks by Phase</div>
    ${metrics.map(m => `
      <div class="metric-grid">
        <div class="phase-name">${m.name}</div>
        <div class="task-count">${m.count} →</div>
      </div>
    `).join('')}
  </div>

  <div class="section">
    <div class="section-title">🤖 Active Agents</div>
    ${activeAgents.length > 0 ? activeAgents.map(agent => `
      <div class="agent">
        <div class="agent-status ${agent.isActive ? 'active' : 'idle'}"></div>
        <div class="agent-info">
          <div class="agent-name">${agent.name}</div>
          ${agent.taskId ? `<div class="agent-task">${agent.taskId}: ${agent.taskTitle}</div>` : '<div class="agent-task">Idle</div>'}
        </div>
      </div>
    `).join('') : '<div class="empty-state">No active sessions</div>'}
  </div>

  <div class="section">
    <div class="section-title">🚧 Blockers</div>
    <div class="blocker-count">${this._getBlockedCount(board)} blocked task${this._getBlockedCount(board) === 1 ? '' : 's'}</div>
  </div>

  <div class="quick-actions">
    <button onclick="createTask()">+ Create Task</button>
    <button onclick="spawnAgent()">⚡ Spawn Agent</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function createTask() {
      vscode.postMessage({ type: 'createTask' });
    }

    function spawnAgent() {
      vscode.postMessage({ type: 'spawnAgent' });
    }

    // Listen for board updates
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'updateBoard') {
        // Refresh view with new board data
        window.location.reload();
      }
    });
  </script>
</body>
</html>`;
  }

  private _calculateMetrics(board?: Board) {
    if (!board) {
      return [];
    }

    const phaseCounts = new Map<string, number>();

    // Count tasks by phase (column)
    board.items.forEach(task => {
      const count = phaseCounts.get(task.columnId) || 0;
      phaseCounts.set(task.columnId, count + 1);
    });

    // Map column IDs to readable names
    return board.columns.map(col => ({
      name: col.name,
      count: phaseCounts.get(col.id) || 0
    }));
  }

  private _getActiveAgents(board?: Board): Array<{
    name: string;
    isActive: boolean;
    taskId?: string;
    taskTitle?: string;
  }> {
    if (!board) {
      return [];
    }

    const activeAgents: any[] = [];
    const seenAgents = new Set<string>();

    // Find all tasks with active owners
    board.items.forEach((task: any) => {
      if (task.owner && task.owner.type === 'agent') {
        const agentKey = `${task.owner.name}-${task.owner.sessionId || ''}`;
        if (!seenAgents.has(agentKey)) {
          seenAgents.add(agentKey);
          activeAgents.push({
            name: task.owner.name,
            isActive: true,
            taskId: task.id,
            taskTitle: task.title
          });
        }
      }
    });

    return activeAgents;
  }

  private _getBlockedCount(board?: Board): number {
    if (!board) {
      return 0;
    }
    return board.items.filter(task => task.status === 'blocked').length;
  }
}

export function registerBoardOverview(context: vscode.ExtensionContext): BoardOverviewProvider {
  const provider = new BoardOverviewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      BoardOverviewProvider.viewType,
      provider
    )
  );

  return provider;
}
