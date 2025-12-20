import * as vscode from 'vscode';
import { Board, Task, Column } from './features/types';

/**
 * Metrics dashboard view provider for the Kanban sidebar.
 * Shows development cycle metrics, WIP limits, and quick actions.
 */
export class MetricsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'kanbanMetricsView';

  private view: vscode.WebviewView | undefined;
  private board: Board | undefined;

  constructor(private readonly extensionUri: vscode.Uri) { }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    webviewView.webview.html = this.getHtml();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'onboardAgent': {
          const prompt = `Read the DevOps framework rules in .agent/rules/ (especially dev_ops_guide.md and the phase_* rules). Then pick the highest priority available task from the Kanban board using /pick_task and start working on it following the appropriate phase rule.`;
          await vscode.env.clipboard.writeText(prompt);
          vscode.window.showInformationMessage('Agent prompt copied! Paste it in a new agent window to start.');
          break;
        }
      }
    });
  }

  public updateBoard(board: Board): void {
    this.board = board;
    if (this.view) {
      this.view.webview.html = this.getHtml();
    }
  }

  private getHtml(): string {
    const metrics = this.calculateMetrics();

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
      padding: 12px;
      margin: 0;
    }
    h2 { font-size: 14px; margin: 0 0 12px; font-weight: 600; }
    h3 { font-size: 12px; margin: 16px 0 8px; font-weight: 600; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.5px; }
    
    .metric-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--vscode-charts-blue, #3b82f6);
      margin-bottom: 4px;
    }
    .metric-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-row {
      display: flex;
      gap: 8px;
    }
    .metric-row .metric-card {
      flex: 1;
      text-align: center;
    }
    
    .column-stats {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.05));
      font-size: 12px;
    }
    .column-stats:last-child { border-bottom: none; }
    .column-name { flex: 1; }
    .column-count {
      min-width: 30px;
      text-align: right;
      font-weight: 600;
    }
    .wip-warning { color: #ef4444; }
    .wip-ok { color: #22c55e; }
    
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .status-in_progress { background: #22c55e; }
    .status-blocked { background: #ef4444; }
    .status-pending { background: #f97316; }
    
    .quick-action {
      display: block;
      width: 100%;
      padding: 8px 12px;
      margin-top: 8px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      cursor: pointer;
      font-size: 12px;
      text-align: left;
    }
    .quick-action:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .spawn-agent {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      font-weight: 600;
    }
    .spawn-agent:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    }
    .hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin: 4px 0 0;
      font-style: italic;
    }
    
    .empty-state {
      text-align: center;
      padding: 24px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <h2>📊 Board Metrics</h2>
  
  <div class="metric-row">
    <div class="metric-card">
      <div class="metric-value">${metrics.totalTasks}</div>
      <div class="metric-label">Total Tasks</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.completedToday}</div>
      <div class="metric-label">Done Today</div>
    </div>
  </div>
  
  <div class="metric-row">
    <div class="metric-card">
      <div class="metric-value">${metrics.inProgress}</div>
      <div class="metric-label">In Progress</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.blocked}</div>
      <div class="metric-label">Blocked</div>
    </div>
  </div>
  
  <h3>Column Distribution</h3>
  <div class="metric-card">
    ${metrics.columnStats.map(col => `
      <div class="column-stats">
        <span class="column-name">${col.name}</span>
        <span class="column-count ${col.overLimit ? 'wip-warning' : ''}">${col.count}</span>
      </div>
    `).join('')}
  </div>
  
  <h3>Status Overview</h3>
  <div class="metric-card">
    <div class="column-stats">
      <span><span class="status-dot status-in_progress"></span>In Progress</span>
      <span class="column-count wip-ok">${metrics.statusCounts.in_progress}</span>
    </div>
    <div class="column-stats">
      <span><span class="status-dot status-blocked"></span>Blocked</span>
      <span class="column-count wip-warning">${metrics.statusCounts.blocked}</span>
    </div>
    <div class="column-stats">
      <span><span class="status-dot status-pending"></span>Pending Approval</span>
      <span class="column-count">${metrics.statusCounts.pending}</span>
    </div>
  </div>
  
  <h3>Agent</h3>
  <button class="quick-action spawn-agent" onclick="onboardAgent()">🚀 Onboard Agent</button>
  <p class="hint">Copies prompt to start an agent with framework context</p>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    function onboardAgent() {
      vscode.postMessage({ type: 'onboardAgent' });
    }
  </script>
</body>
</html>`;
  }

  private calculateMetrics(): BoardMetrics {
    if (!this.board) {
      return {
        totalTasks: 0,
        completedToday: 0,
        inProgress: 0,
        blocked: 0,
        columnStats: [],
        statusCounts: { todo: 0, in_progress: 0, blocked: 0, pending: 0, done: 0 },
      };
    }

    const items = this.board.items || [];
    const columns = this.board.columns || [];
    const today = new Date().toISOString().split('T')[0];

    // Count tasks by status
    const statusCounts = { todo: 0, in_progress: 0, blocked: 0, pending: 0, done: 0 };
    items.forEach(task => {
      const status = task.status || 'todo';
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }
    });

    // Count tasks by column
    const columnStats = columns.map(col => ({
      id: col.id,
      name: col.name,
      count: items.filter(t => t.columnId === col.id).length,
      overLimit: false, // TODO: implement WIP limits
    }));

    // Count completed today
    const completedToday = items.filter(task => {
      if (task.columnId !== 'col-done') {
        return false;
      }
      const updated = task.updatedAt?.split('T')[0];
      return updated === today;
    }).length;

    return {
      totalTasks: items.length,
      completedToday,
      inProgress: statusCounts.in_progress,
      blocked: statusCounts.blocked,
      columnStats,
      statusCounts,
    };
  }
}

interface BoardMetrics {
  totalTasks: number;
  completedToday: number;
  inProgress: number;
  blocked: number;
  columnStats: Array<{ id: string; name: string; count: number; overLimit: boolean }>;
  statusCounts: { todo: number; in_progress: number; blocked: number; pending: number; done: number };
}

export function registerMetricsView(context: vscode.ExtensionContext): MetricsViewProvider {
  const provider = new MetricsViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(MetricsViewProvider.viewType, provider)
  );
  return provider;
}
