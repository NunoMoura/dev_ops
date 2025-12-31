import * as vscode from 'vscode';
import { Board } from './features/types';
import { readBoard } from './features/boardStore';
import { runBoardOps } from './handlers/pythonRunner';
import { formatError } from './features/errors';

/**
 * Unified Dashboard View Provider
 * Combines Status Overview and Active Agents into a single webview.
 */
export class DashboardViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'devopsDashboardView';

    private view: vscode.WebviewView | undefined;
    private board: Board | undefined;

    constructor(private readonly extensionUri: vscode.Uri) { }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };

        // Initial render
        this.refresh();
    }

    public updateBoard(board: Board): void {
        this.board = board;
        this.refresh();
    }

    public async refresh(): Promise<void> {
        if (!this.view) { return; }

        const metrics = this.calculateMetrics();
        const agents = await this.getAgents();

        this.view.webview.html = this.getHtml(metrics, agents);
    }

    private calculateMetrics(): StatusMetrics {
        if (!this.board) {
            return {
                statusCounts: { ready: 0, agent_active: 0, needs_feedback: 0, blocked: 0, done: 0 },
            };
        }

        const items = this.board.items || [];
        const statusCounts = { ready: 0, agent_active: 0, needs_feedback: 0, blocked: 0, done: 0 };
        items.forEach(task => {
            const status = task.status || 'ready';
            if (status in statusCounts) {
                statusCounts[status as keyof typeof statusCounts]++;
            }
        });

        return { statusCounts };
    }

    private async getAgents(): Promise<any[]> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) { return []; }

            const result = await runBoardOps(['active-agents'], workspaceRoot);
            if (result.code !== 0) {
                console.error('Failed to fetch agents:', result.stderr);
                return [];
            }
            return JSON.parse(result.stdout || '[]');
        } catch (error) {
            console.error('Error fetching agents:', error);
            return [];
        }
    }

    private getHtml(metrics: StatusMetrics, agents: any[]): string {
        const agentsHtml = this.renderAgentsList(agents);

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
    
    /* Status Card Styles */
    .metric-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
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

    /* Active Agents Styles */
    .section-header {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 12px;
      font-weight: 600;
    }

    .agent-item {
      display: flex;
      align-items: flex-start;
      padding: 8px 0;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.05));
    }
    .agent-icon {
      margin-right: 10px;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }
    .agent-details {
      flex: 1;
      overflow: hidden;
    }
    .agent-name {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .agent-task {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .agent-phase {
      font-size: 11px;
      color: var(--vscode-textPreformat-foreground);
      margin-top: 2px;
      display: inline-block;
      background: var(--vscode-textBlockQuote-background);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .empty-state {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      padding: 12px 0;
      text-align: center;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <!-- Status Box -->
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

  <!-- Active Agents Section -->
  <div class="section-header">Active Agents</div>
  <div class="agents-list">
    ${agentsHtml}
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
  </script>
</body>
</html>`;
    }

    private renderAgentsList(agents: any[]): string {
        if (agents.length === 0) {
            return `<div class="empty-state">No active agent at the moment</div>`;
        }

        return agents.map(agent => {
            const type = agent.owner?.type || 'agent';
            const name = agent.owner?.name || 'Unknown';
            const taskTitle = agent.task_title || 'No task';
            const taskId = agent.task_id || '';
            const phase = agent.phase || 'Idle';
            const icon = type === 'antigravity' ? '🤖' : '👤'; // Simple icons for now

            return `
        <div class="agent-item">
          <div class="agent-icon">${icon}</div>
          <div class="agent-details">
            <div class="agent-name">${name} <span style="opacity:0.7; font-weight:normal">(${type})</span></div>
            <div class="agent-task">${taskId ? taskId + ': ' : ''}${taskTitle}</div>
            <div class="agent-phase">${phase}</div>
          </div>
        </div>
      `;
        }).join('');
    }
}

interface StatusMetrics {
    statusCounts: { ready: number; agent_active: number; needs_feedback: number; blocked: number; done: number };
}

export function registerDashboardView(context: vscode.ExtensionContext): DashboardViewProvider {
    const provider = new DashboardViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(DashboardViewProvider.viewType, provider)
    );
    return provider;
}
