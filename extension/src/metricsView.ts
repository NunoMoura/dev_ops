import * as vscode from 'vscode';
import { Board } from './features/types';

/**
 * Status node for the tree view.
 */
class StatusNode extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}

/**
 * Status view provider for the DevOps sidebar.
 * Shows task status overview as an inline, non-collapsible tree item.
 */
export class MetricsViewProvider implements vscode.TreeDataProvider<StatusNode> {
  public static readonly viewType = 'devopsMetricsView';

  private _onDidChangeTreeData = new vscode.EventEmitter<StatusNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private board: Board | undefined;

  constructor() { }

  public updateBoard(board: Board): void {
    this.board = board;
    this._onDidChangeTreeData.fire();
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: StatusNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: StatusNode): StatusNode[] {
    // Root level only - single non-collapsible item
    if (!element) {
      const metrics = this.calculateMetrics();
      const statusText = `Ready ${metrics.statusCounts.ready} | Active Agents ${metrics.statusCounts.agent_active} | Needs Feedback ${metrics.statusCounts.needs_feedback} | Blocked ${metrics.statusCounts.blocked}`;

      const node = new StatusNode(statusText, vscode.TreeItemCollapsibleState.None);
      node.tooltip = 'Task status overview';
      node.iconPath = new vscode.ThemeIcon('dashboard');

      return [node];
    }

    return [];
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
  const provider = new MetricsViewProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(MetricsViewProvider.viewType, provider),
    vscode.commands.registerCommand('devops.refreshMetrics', () => provider.refresh())
  );
  return provider;
}
