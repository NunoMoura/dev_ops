import * as vscode from 'vscode';
import { Board } from './features/types';
import { readBoard } from './features/boardStore';
import { runBoardOps } from './handlers/pythonRunner';
import { formatError } from './features/errors';
import { log } from './features/logger';

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
    log('[Dashboard] resolveWebviewView called');
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    // Initial render (Immediate)
    // Show status card (if available) and "Loading..." for agents
    log('[Dashboard] Rendering initial HTML...');
    const metrics = this.calculateMetrics();
    this.view.webview.html = this.getHtml(metrics, null); // null agents = loading state
    log('[Dashboard] Initial HTML set, starting async refresh...');

    // Fetch real data
    this.refresh();
  }

  public updateBoard(board: Board): void {
    this.board = board;
    // When board updates, we re-render immediately with existing agents (or fetch new ones)
    this.refresh();
  }

  public async refresh(): Promise<void> {
    if (!this.view) { return; }

    try {
      log('[Dashboard] Starting refresh...');
      const metrics = this.calculateMetrics();
      log(`[Dashboard] Metrics calculated: ${JSON.stringify(metrics.statusCounts)}`);

      // Timeout for agent fetching (2 seconds)
      const agentsPromise = this.getAgents();
      const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => {
        log('[Dashboard] Agent fetch timed out');
        resolve([]);
      }, 2000));

      // Race fetching vs timeout
      const agents = await Promise.race([agentsPromise, timeoutPromise]);
      log(`[Dashboard] Got ${agents?.length ?? 0} agents`);

      // Final render with data (or empty array if timed out)
      this.view.webview.html = this.getHtml(metrics, agents);
      log('[Dashboard] HTML rendered successfully');
    } catch (error) {
      log(`[Dashboard] Refresh error: ${formatError(error)}`);
      // Render error state
      if (this.view) {
        this.view.webview.html = this.getErrorHtml(formatError(error));
      }
    }
  }

  private getErrorHtml(errorMessage: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    body {
      font-family: var(--vscode-font-family), sans-serif;
      padding: 16px;
      color: var(--vscode-foreground);
    }
    .error { color: var(--vscode-errorForeground); padding: 12px; border-radius: 4px; background: var(--vscode-inputValidation-errorBackground); }
  </style>
</head>
<body>
  <div class="error">
    <strong>Dashboard Error</strong><br>
    ${errorMessage}
  </div>
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
      if (!workspaceRoot) {
        log('[Dashboard] No workspace root for agent fetch');
        return [];
      }

      log(`[Dashboard] Fetching agents from workspace: ${workspaceRoot}`);
      const result = await runBoardOps(['active-agents'], workspaceRoot);
      if (result.code !== 0) {
        log(`[Dashboard] Agent fetch failed: ${result.stderr}`);
        return [];
      }
      const agents = JSON.parse(result.stdout || '[]');
      log(`[Dashboard] Parsed ${agents.length} agents`);
      return agents;
    } catch (error) {
      log(`[Dashboard] Error fetching agents: ${formatError(error)}`);
      return [];
    }
  }

  private getHtml(metrics: StatusMetrics, agents: any[] | null): string {
    const agentsHtml = agents === null
      ? '<div class="empty-state">Loading active agents...</div>'
      : this.renderAgentsList(agents);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    :root { color-scheme: var(--vscode-colorScheme); }
    body {
      font-family: var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

  private renderAgentsList(agents: any[] | null): string {
    if (!agents || agents.length === 0) {
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
  log('[Dashboard] Registering DashboardViewProvider...');
  const provider = new DashboardViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DashboardViewProvider.viewType, provider)
  );
  log(`[Dashboard] Registered for viewType: ${DashboardViewProvider.viewType}`);
  return provider;
}
