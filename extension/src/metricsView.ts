import * as vscode from 'vscode';
import { Board, Task, Column } from './features/types';

/**
 * Metrics dashboard view provider for the Kanban sidebar.
 * Shows development cycle metrics, WIP limits, and quick actions.
 */
export class MetricsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'devopsMetricsView';

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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src https://fonts.gstatic.com; style-src 'unsafe-inline' https://fonts.googleapis.com; script-src 'unsafe-inline';">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: var(--vscode-colorScheme); }
    body {
      font-family: 'IBM Plex Sans', var(--vscode-font-family), sans-serif;
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 12px;
      margin: 0;
    }
    h3 { 
      font-size: 12px; 
      margin: 0 0 8px; 
      font-weight: 600; 
      color: var(--vscode-descriptionForeground); 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
    }
    h3:not(:first-child) {
      margin-top: 16px;
    }
    
    .metric-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
    }
    
    /* Compact stat rows - consistent with Column Distribution and Status Overview */
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.05));
      font-size: 12px;
    }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { flex: 1; }
    .stat-value {
      min-width: 30px;
      text-align: right;
      font-weight: 600;
    }
    .stat-value.highlight { color: var(--vscode-charts-blue, #3b82f6); }
    .stat-value.success { color: #22c55e; }
    .stat-value.warning { color: #ef4444; }
    .stat-value.pending { color: #f97316; }
    
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
    
    .priority-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .priority-high { background: #ef4444; }
    .priority-medium { background: #f97316; }
    .priority-low { background: #22c55e; }
    
    .empty-state {
      text-align: center;
      padding: 24px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <h3>Column Distribution</h3>
  <div class="metric-card">
    ${metrics.columnStats.map(col => `
      <div class="stat-row">
        <span class="stat-label">${col.name}</span>
        <span class="stat-value ${col.overLimit ? 'warning' : ''}">${col.count}</span>
      </div>
    `).join('')}
  </div>
  
  <h3>Status Overview</h3>
  <div class="metric-card">
    <div class="stat-row">
      <span><span class="status-dot status-in_progress"></span>In Progress</span>
      <span class="stat-value">${metrics.statusCounts.in_progress}</span>
    </div>
    <div class="stat-row">
      <span><span class="status-dot status-blocked"></span>Blocked</span>
      <span class="stat-value ${metrics.statusCounts.blocked > 0 ? 'warning' : ''}">${metrics.statusCounts.blocked}</span>
    </div>
    <div class="stat-row">
      <span><span class="status-dot status-pending"></span>Pending Approval</span>
      <span class="stat-value">${metrics.statusCounts.pending}</span>
    </div>
  </div>
  
  <h3>Priority Breakdown</h3>
  <div class="metric-card">
    <div class="stat-row">
      <span><span class="priority-dot priority-high"></span>High Priority</span>
      <span class="stat-value">${metrics.priorityCounts.high}</span>
    </div>
    <div class="stat-row">
      <span><span class="priority-dot priority-medium"></span>Medium Priority</span>
      <span class="stat-value">${metrics.priorityCounts.medium}</span>
    </div>
    <div class="stat-row">
      <span><span class="priority-dot priority-low"></span>Low Priority</span>
      <span class="stat-value">${metrics.priorityCounts.low}</span>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
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
        priorityCounts: { high: 0, medium: 0, low: 0 },
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

    // Count tasks by column with WIP limits
    const WIP_LIMIT = 3; // Max tasks in active columns
    const activeColumns = ['col-understand', 'col-plan', 'col-build', 'col-verify'];
    const columnStats = columns.map(col => {
      const count = items.filter(t => t.columnId === col.id).length;
      const hasLimit = activeColumns.includes(col.id);
      return {
        id: col.id,
        name: col.name,
        count,
        overLimit: hasLimit && count > WIP_LIMIT,
      };
    });

    // Count tasks by priority
    const priorityCounts = { high: 0, medium: 0, low: 0 };
    items.forEach(task => {
      const priority = task.priority || 'medium';
      if (priority in priorityCounts) {
        priorityCounts[priority as keyof typeof priorityCounts]++;
      }
    });

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
      priorityCounts,
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
  priorityCounts: { high: number; medium: number; low: number };
}

export function registerMetricsView(context: vscode.ExtensionContext): MetricsViewProvider {
  const provider = new MetricsViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(MetricsViewProvider.viewType, provider)
  );
  return provider;
}
