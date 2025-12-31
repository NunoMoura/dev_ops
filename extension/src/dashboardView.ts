import * as vscode from 'vscode';
import { Board } from './features/types';
import { readBoard } from './features/boardStore';
import { log } from './features/logger';

/**
 * Node types for the Dashboard sidebar.
 */
interface DashboardHeaderNode {
  kind: 'header';
  id: string;
  label: string;
}

interface DashboardStatNode {
  kind: 'stat';
  id: string;
  label: string;
  value: number;
  icon: string;
  color?: string;
}

interface DashboardMessageNode {
  kind: 'message';
  id: string;
  label: string;
}

type DashboardNode = DashboardHeaderNode | DashboardStatNode | DashboardMessageNode;

/**
 * Tree data provider for the Dashboard section.
 * Shows status overview using a tree structure instead of webview.
 */
export class DashboardViewProvider implements vscode.TreeDataProvider<DashboardNode> {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<DashboardNode | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

  private board: Board | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {
    log('[Dashboard] TreeDataProvider created');
  }

  public updateBoard(board: Board): void {
    this.board = board;
    this.onDidChangeEmitter.fire(undefined);
  }

  public async refresh(): Promise<void> {
    log('[Dashboard] Refreshing...');
    try {
      this.board = await readBoard();
      log('[Dashboard] Board loaded, refreshing tree');
      this.onDidChangeEmitter.fire(undefined);
    } catch (error) {
      log(`[Dashboard] Error loading board: ${error}`);
    }
  }

  getChildren(element?: DashboardNode): DashboardNode[] {
    if (element) {
      return []; // No nested children
    }

    // Load board if not present
    if (!this.board) {
      // Return loading message; async load
      this.refresh().catch(() => { });
      return [
        { kind: 'message', id: 'loading', label: 'Loading dashboard...' }
      ];
    }

    const items = this.board.items || [];
    const statusCounts = { ready: 0, agent_active: 0, needs_feedback: 0, blocked: 0 };

    items.forEach(task => {
      const status = task.status || 'ready';
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }
    });

    const nodes: DashboardNode[] = [
      { kind: 'stat', id: 'stat-ready', label: 'Ready', value: statusCounts.ready, icon: 'circle-filled', color: 'charts.blue' },
      { kind: 'stat', id: 'stat-active', label: 'Agent Active', value: statusCounts.agent_active, icon: 'circle-filled', color: 'charts.green' },
      { kind: 'stat', id: 'stat-feedback', label: 'Needs Feedback', value: statusCounts.needs_feedback, icon: 'circle-filled', color: 'charts.orange' },
      { kind: 'stat', id: 'stat-blocked', label: 'Blocked', value: statusCounts.blocked, icon: 'circle-filled', color: 'charts.red' },
    ];

    // Add agent section - use type assertion for owner which exists at runtime
    const activeAgents = items.filter(t => {
      const taskAny = t as Record<string, unknown>;
      return t.status === 'agent_active' && taskAny.owner;
    });
    nodes.push({ kind: 'header', id: 'agents-header', label: 'Active Agents' });

    if (activeAgents.length === 0) {
      nodes.push({ kind: 'message', id: 'no-agents', label: 'No active agent at the moment' });
    } else {
      activeAgents.forEach(task => {
        const taskAny = task as Record<string, unknown>;
        const owner = taskAny.owner as { name?: string } | undefined;
        const name = owner?.name || 'Agent';
        nodes.push({
          kind: 'message',
          id: `agent-${task.id}`,
          label: `${name}: ${task.title}`
        });
      });
    }

    return nodes;
  }

  getTreeItem(element: DashboardNode): vscode.TreeItem {
    if (element.kind === 'header') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.id = element.id;
      item.contextValue = 'dashboardHeader';
      // Make header bold/prominent
      item.description = '';
      return item;
    }

    if (element.kind === 'stat') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.id = element.id;
      item.description = `${element.value}`;
      item.iconPath = new vscode.ThemeIcon(element.icon, element.color ? new vscode.ThemeColor(element.color) : undefined);
      item.contextValue = 'dashboardStat';
      return item;
    }

    // Message node
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    item.contextValue = 'dashboardMessage';
    return item;
  }

  getParent(): DashboardNode | undefined {
    return undefined;
  }
}

export function registerDashboardView(context: vscode.ExtensionContext): DashboardViewProvider {
  log('[Dashboard] Registering TreeDataProvider...');
  const provider = new DashboardViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('devopsDashboardView', provider)
  );

  log('[Dashboard] Registered for viewType: devopsDashboardView');
  return provider;
}
