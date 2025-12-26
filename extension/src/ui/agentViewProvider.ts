import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Node types for the Agent sidebar.
 * Shows: Current Task, Quick Actions, and optionally workflow files.
 */
export interface AgentCurrentTaskNode {
    kind: 'current-task';
    id: string;
    taskId: string;
    title: string;
    phase: string;
    status: string;
}

export interface AgentActionNode {
    kind: 'action';
    id: string;
    label: string;
    icon: string;
    command: string;
    args?: unknown[];
}

export interface AgentCategoryNode {
    kind: 'category';
    id: string;
    label: string;
    icon: string;
}

export interface AgentInfoNode {
    kind: 'info';
    id: string;
    label: string;
    description?: string;
}

export type AgentNode = AgentCurrentTaskNode | AgentActionNode | AgentCategoryNode | AgentInfoNode;

/**
 * Quick action buttons for the Agent sidebar.
 */
const QUICK_ACTIONS: AgentActionNode[] = [
    { kind: 'action', id: 'spawn-agent', label: 'Spawn Agent', icon: 'play', command: 'devops.spawnAgent' },
    { kind: 'action', id: 'next-phase', label: 'Next Phase', icon: 'arrow-right', command: 'devops.nextPhase' },
    { kind: 'action', id: 'create-task', label: 'Create Task', icon: 'add', command: 'kanban.createTask' },
    { kind: 'action', id: 'claim-task', label: 'Claim Task', icon: 'person', command: 'kanban.claimTask' },
];

/**
 * Tree data provider for the Agent section.
 * Shows Current Task context and Quick Actions for project management.
 */
export class AgentViewProvider implements vscode.TreeDataProvider<AgentNode> {
    private readonly onDidChangeEmitter = new vscode.EventEmitter<AgentNode | undefined>();
    readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

    private workspaceRoot: string | undefined;
    private currentTask: { id: string; title: string; phase: string; status: string } | null = null;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders?.length) {
            this.workspaceRoot = folders[0].uri.fsPath;
        }
    }

    refresh(): void {
        this.loadCurrentTask();
        this.onDidChangeEmitter.fire(undefined);
    }

    private loadCurrentTask(): void {
        if (!this.workspaceRoot) {
            this.currentTask = null;
            return;
        }

        try {
            // Read .current_task file
            const currentTaskPath = path.join(this.workspaceRoot, 'dev_ops', '.current_task');
            if (!fs.existsSync(currentTaskPath)) {
                this.currentTask = null;
                return;
            }

            const taskId = fs.readFileSync(currentTaskPath, 'utf8').trim();
            if (!taskId) {
                this.currentTask = null;
                return;
            }

            // Read board.json to get task details
            const boardPath = path.join(this.workspaceRoot, 'dev_ops', 'board.json');
            if (!fs.existsSync(boardPath)) {
                this.currentTask = { id: taskId, title: 'Unknown', phase: 'Unknown', status: 'unknown' };
                return;
            }

            const board = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
            const task = board.items?.find((t: { id: string }) => t.id === taskId);
            if (!task) {
                this.currentTask = { id: taskId, title: 'Not found', phase: 'Unknown', status: 'unknown' };
                return;
            }

            const column = board.columns?.find((c: { id: string }) => c.id === task.columnId);
            this.currentTask = {
                id: taskId,
                title: task.title || 'Untitled',
                phase: column?.name || 'Unknown',
                status: task.status || 'todo',
            };
        } catch {
            this.currentTask = null;
        }
    }

    getChildren(element?: AgentNode): AgentNode[] {
        // Root level: show sections
        if (!element) {
            this.loadCurrentTask();

            const nodes: AgentNode[] = [];

            // Current Task section
            nodes.push({
                kind: 'category',
                id: 'current-task-section',
                label: 'Current Task',
                icon: 'target',
            });

            // Quick Actions section
            nodes.push({
                kind: 'category',
                id: 'quick-actions-section',
                label: 'Quick Actions',
                icon: 'zap',
            });

            return nodes;
        }

        // Current Task section children
        if (element.kind === 'category' && element.id === 'current-task-section') {
            if (!this.currentTask) {
                return [{
                    kind: 'info',
                    id: 'no-task',
                    label: 'No active task',
                    description: 'Use "Spawn Agent" to start',
                }];
            }

            return [{
                kind: 'current-task',
                id: 'current-task-info',
                taskId: this.currentTask.id,
                title: this.currentTask.title,
                phase: this.currentTask.phase,
                status: this.currentTask.status,
            }];
        }

        // Quick Actions section children
        if (element.kind === 'category' && element.id === 'quick-actions-section') {
            return [...QUICK_ACTIONS];
        }

        return [];
    }

    getTreeItem(element: AgentNode): vscode.TreeItem {
        if (element.kind === 'category') {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.Expanded
            );
            item.id = element.id;
            item.iconPath = new vscode.ThemeIcon(element.icon);
            item.contextValue = 'agentCategory';
            return item;
        }

        if (element.kind === 'current-task') {
            const item = new vscode.TreeItem(
                `${element.taskId}: ${element.title}`,
                vscode.TreeItemCollapsibleState.None
            );
            item.id = element.id;
            item.description = `${element.phase} • ${element.status}`;
            item.iconPath = new vscode.ThemeIcon('bookmark');
            item.tooltip = `Task: ${element.taskId}\nTitle: ${element.title}\nPhase: ${element.phase}\nStatus: ${element.status}`;
            item.command = {
                command: 'kanban.showTaskDetails',
                title: 'Show Task Details',
                arguments: [element.taskId],
            };
            item.contextValue = 'agentCurrentTask';
            return item;
        }

        if (element.kind === 'action') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
            item.id = element.id;
            item.iconPath = new vscode.ThemeIcon(element.icon);
            item.command = {
                command: element.command,
                title: element.label,
                arguments: element.args,
            };
            item.contextValue = 'agentAction';
            return item;
        }

        if (element.kind === 'info') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
            item.id = element.id;
            item.description = element.description;
            item.iconPath = new vscode.ThemeIcon('info');
            item.contextValue = 'agentInfo';
            return item;
        }

        // Fallback
        return new vscode.TreeItem('Unknown');
    }

    getParent(): AgentNode | undefined {
        return undefined;
    }
}

/**
 * Register the Agent view provider.
 */
export function registerAgentView(context: vscode.ExtensionContext): AgentViewProvider {
    const provider = new AgentViewProvider();

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('devopsAgentView', provider)
    );

    // Watch for changes to .current_task and board.json
    const currentTaskWatcher = vscode.workspace.createFileSystemWatcher('**/dev_ops/.current_task');
    currentTaskWatcher.onDidCreate(() => provider.refresh());
    currentTaskWatcher.onDidDelete(() => provider.refresh());
    currentTaskWatcher.onDidChange(() => provider.refresh());
    context.subscriptions.push(currentTaskWatcher);

    const boardWatcher = vscode.workspace.createFileSystemWatcher('**/dev_ops/board.json');
    boardWatcher.onDidChange(() => provider.refresh());
    context.subscriptions.push(boardWatcher);

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.refreshAgent', () => provider.refresh())
    );

    return provider;
}
