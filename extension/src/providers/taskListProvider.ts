import * as vscode from 'vscode';
import { Board, Task } from '../features/types';

/**
 * Task List Provider - Tree view of tasks grouped by phase
 * 
 * Features:
 * - Tasks organized by column/phase
 * - Click to open task details
 * - Context menu actions (Claim, Move, Delete)
 * - Drag-and-drop between phases (future)
 */
export class TaskListProvider implements vscode.TreeDataProvider<TaskListItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TaskListItem | undefined | null | void> = new vscode.EventEmitter<TaskListItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TaskListItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _board?: Board;

    constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateBoard(board: Board): void {
        this._board = board;
        this.refresh();
    }

    getTreeItem(element: TaskListItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TaskListItem): Thenable<TaskListItem[]> {
        if (!this._board) {
            return Promise.resolve([]);
        }

        if (!element) {
            // Root level: show phases
            return Promise.resolve(this._getPhaseNodes());
        } else if (element.type === 'phase') {
            // Phase level: show tasks in that phase
            return Promise.resolve(this._getTaskNodes(element.columnId!));
        }

        return Promise.resolve([]);
    }

    private _getPhaseNodes(): TaskListItem[] {
        if (!this._board) {
            return [];
        }

        return this._board.columns.map(column => {
            const tasksInColumn = this._board!.items.filter(t => t.columnId === column.id);
            const label = `${column.name} (${tasksInColumn.length})`;

            return new TaskListItem(
                label,
                vscode.TreeItemCollapsibleState.Expanded,
                'phase',
                column.id
            );
        });
    }

    private _getTaskNodes(columnId: string): TaskListItem[] {
        if (!this._board) {
            return [];
        }

        const tasks = this._board.items.filter(t => t.columnId === columnId);

        return tasks.map(task => {
            const icon = this._getTaskIcon(task);
            const ownerInfo = (task as any).owner ? ` 👤 ${(task as any).owner.name}` : '';
            const label = `${icon} ${task.id}: ${task.title}${ownerInfo}`;

            const item = new TaskListItem(
                label,
                vscode.TreeItemCollapsibleState.None,
                'task',
                undefined,
                task
            );

            // Make task clickable
            item.command = {
                command: 'devops.showTaskDetails',
                title: 'Open Task',
                arguments: [task.id]
            };

            // Context value for context menu
            item.contextValue = 'task';

            return item;
        });
    }

    private _getTaskIcon(task: Task): string {
        switch (task.priority) {
            case 'critical':
            case 'high':
                return '🔴';
            case 'medium':
                return '🟡';
            case 'low':
                return '🟢';
            default:
                return '⚪';
        }
    }
}

class TaskListItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'phase' | 'task',
        public readonly columnId?: string,
        public readonly task?: Task
    ) {
        super(label, collapsibleState);

        if (type === 'phase') {
            this.iconPath = new vscode.ThemeIcon('folder');
        } else if (type === 'task') {
            this.iconPath = new vscode.ThemeIcon('issue-opened');
        }
    }
}

export function registerTaskList(context: vscode.ExtensionContext): TaskListProvider {
    const provider = new TaskListProvider();

    const treeView = vscode.window.createTreeView('devopsTaskList', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    context.subscriptions.push(treeView);

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.refreshTaskList', () => {
            provider.refresh();
        })
    );

    return provider;
}
