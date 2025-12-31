import * as vscode from 'vscode';
import { Board } from './features/types';

/**
 * Status view provider for the DevOps sidebar.
 * Shows task status overview with colored indicators.
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
    
    .metric-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
      border-radius: 8px;
      padding: 16px;
    }
    
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.05));
      font-size: 13px;
    }
    .stat-row:last-child { border-bottom: none; padding-bottom: 0; }
    .stat-value {
      min-width: 30px;
      text-align: right;
      font-weight: 600;
    }
    .stat-value.warning { color: #ef4444; }
    
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .status-ready { background: #3b82f6; }
    .status-agent_active { background: #22c55e; }
    .status-needs_feedback { background: #f97316; }
    .status-blocked { background: #ef4444; }
  </style>
</head>
<body>
  <div class="metric-card">
    <div class="stat-row">
      <span><span class="status-dot status-ready"></span>Ready</span>
      <span class="stat-value">${metrics.statusCounts.ready || 0}</span>
    </div>
    <div class="stat-row">
      <span><span class="status-dot status-agent_active"></span>Agent Active</span>
      <span class="stat-value">${metrics.statusCounts.agent_active || 0}</span>
    </div>
    <div class="stat-row">
      <span><span class="status-dot status-needs_feedback"></span>Needs Feedback</span>
      <span class="stat-value">${metrics.statusCounts.needs_feedback || 0}</span>
    </div>
    <div class="stat-row">
      <span><span class="status-dot status-blocked"></span>Blocked</span>
      <span class="stat-value ${metrics.statusCounts.blocked > 0 ? 'warning' : ''}">${metrics.statusCounts.blocked || 0}</span>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
  </script>
</body>
</html>`;
  }

  private calculateMetrics(): StatusMetrics {
    if (!this.board) {
      return {
        statusCounts: { ready: 0, agent_active: 0, needs_feedback: 0, blocked: 0, done: 0 },
      };
    }

    const items = this.board.items || [];

    // Count tasks by status
    const statusCounts = { ready: 0, agent_active: 0, needs_feedback: 0, blocked: 0, done: 0 };
    items.forEach(task => {
      const status = task.status || 'ready';
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }
    });

    return { statusCounts };
  }
}

interface StatusMetrics {
  statusCounts: { ready: number; agent_active: number; needs_feedback: number; blocked: number; done: number };
}

export function registerMetricsView(context: vscode.ExtensionContext): MetricsViewProvider {
  const provider = new MetricsViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(MetricsViewProvider.viewType, provider)
  );
  return provider;
}
