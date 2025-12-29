import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Minimal tree view for Current Task.
 * Shows single item at root level - no categories, no quick actions.
 */
export interface CurrentTaskNode {
    id: string;
    taskId: string;
    title: string;
    phase: string;
    status: string;
}

export class CurrentTaskViewProvider implements vscode.TreeDataProvider<CurrentTaskNode | string> {
    private readonly onDidChangeEmitter = new vscode.EventEmitter<CurrentTaskNode | string | undefined>();
    readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

    private workspaceRoot: string | undefined;
    private currentTask: CurrentTaskNode | null = null;

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

            const boardPath = path.join(this.workspaceRoot, 'dev_ops', 'board.json');
            if (!fs.existsSync(boardPath)) {
                this.currentTask = { id: 'current', taskId, title: 'Unknown', phase: 'Unknown', status: 'unknown' };
                return;
            }

            const board = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
            const task = board.items?.find((t: { id: string }) => t.id === taskId);
            if (!task) {
                this.currentTask = { id: 'current', taskId, title: 'Not found', phase: 'Unknown', status: 'unknown' };
                return;
            }

            const column = board.columns?.find((c: { id: string }) => c.id === task.columnId);
            this.currentTask = {
                id: 'current',
                taskId,
                title: task.title || 'Untitled',
                phase: column?.name || 'Unknown',
                status: task.status || 'ready',
            };
        } catch {
            this.currentTask = null;
        }
    }

    getChildren(): (CurrentTaskNode | string)[] {
        this.loadCurrentTask();
        if (!this.currentTask) {
            return ['no-task'];
        }
        return [this.currentTask];
    }

    getTreeItem(element: CurrentTaskNode | string): vscode.TreeItem {
        if (typeof element === 'string') {
            const item = new vscode.TreeItem('No active task', vscode.TreeItemCollapsibleState.None);
            item.description = 'Click a task on the board to start';
            item.contextValue = 'noTask';
            return item;
        }

        const item = new vscode.TreeItem(
            `${element.taskId}: ${element.title}`,
            vscode.TreeItemCollapsibleState.None
        );
        item.description = `${element.phase} • ${element.status}`;
        item.tooltip = `Task: ${element.taskId}\nTitle: ${element.title}\nPhase: ${element.phase}\nStatus: ${element.status}`;
        item.command = {
            command: 'kanban.showTaskDetails',
            title: 'Show Task Details',
            arguments: [element.taskId],
        };
        item.contextValue = 'currentTask';
        return item;
    }

    getParent(): undefined {
        return undefined;
    }
}

/**
 * Register the Current Task view provider.
 */
export function registerCurrentTaskView(context: vscode.ExtensionContext): CurrentTaskViewProvider {
    const provider = new CurrentTaskViewProvider();

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('devopsCurrentTaskView', provider)
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
        vscode.commands.registerCommand('devops.refreshCurrentTask', () => provider.refresh())
    );

    return provider;
}
