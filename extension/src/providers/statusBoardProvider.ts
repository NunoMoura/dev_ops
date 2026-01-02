import * as vscode from 'vscode';
import { BoardItemNode } from './boardTreeProvider'; // Re-using item node type
import { Board, Task } from '../features/types';
import { readBoard } from '../features/boardStore';
import { buildTaskDescription, buildTaskTooltip } from '../features/taskPresentation';

export type StatusGroupNode = {
    kind: 'group';
    id: string;
    label: string;
    description?: string;
    icon?: vscode.ThemeIcon;
    tasks: Task[];
};

export type StatusBoardNode = StatusGroupNode | BoardItemNode;

export class StatusBoardProvider implements vscode.TreeDataProvider<StatusBoardNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatusBoardNode | undefined | null | void> = new vscode.EventEmitter<StatusBoardNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatusBoardNode | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: StatusBoardNode): vscode.TreeItem {
        if (element.kind === 'group') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
            item.description = `(${element.tasks.length})`;
            item.iconPath = element.icon || new vscode.ThemeIcon('list-tree');
            item.contextValue = 'statusGroup';
            return item;
        } else {
            const task = element.item;
            const item = new vscode.TreeItem(task.title, vscode.TreeItemCollapsibleState.None);
            item.id = task.id;
            item.description = buildTaskDescription(task);
            item.tooltip = new vscode.MarkdownString(buildTaskTooltip(task, ''));
            item.contextValue = 'devopsTask';
            item.iconPath = this.getTaskIcon(task.status);

            // Allow opening task details on click
            item.command = {
                command: 'devops.openTaskContext',
                title: 'Open Task',
                arguments: [task.id]
            };

            return item;
        }
    }

    getChildren(element?: StatusBoardNode): Thenable<StatusBoardNode[]> {
        if (!element) {
            return this.getRootGroups();
        } else if (element.kind === 'group') {
            return Promise.resolve(element.tasks.map(task => ({
                kind: 'item',
                item: task,
                column: { id: task.columnId, name: '', position: 0 } // Dummy column for type compatibility
            } as BoardItemNode)));
        }
        return Promise.resolve([]);
    }

    private async getRootGroups(): Promise<StatusGroupNode[]> {
        try {
            const board = await readBoard();
            const tasks = board.items;

            // Group definitions
            const groups: StatusGroupNode[] = [
                {
                    kind: 'group',
                    id: 'attention',
                    label: 'Needs Attention',
                    icon: new vscode.ThemeIcon('alert', new vscode.ThemeColor('charts.red')),
                    tasks: tasks.filter(t => t.status && ['blocked', 'needs_feedback'].includes(t.status))
                },
                {
                    kind: 'group',
                    id: 'active',
                    label: 'Active Agents',
                    icon: new vscode.ThemeIcon('zap', new vscode.ThemeColor('charts.green')), // Green to match board cards
                    tasks: tasks.filter(t => t.status === 'agent_active')
                },
                {
                    kind: 'group',
                    id: 'ready',
                    label: 'Ready',
                    icon: new vscode.ThemeIcon('play-circle', new vscode.ThemeColor('charts.blue')),
                    tasks: tasks.filter(t => t.status === 'ready')
                },
                {
                    kind: 'group',
                    id: 'human',
                    label: 'Human Active',
                    icon: new vscode.ThemeIcon('person'),
                    tasks: tasks.filter(t => (t.status === 'in_progress' || t.status === 'agent_active') && (!t.owner || t.owner.type === 'human'))
                },
                {
                    kind: 'group',
                    id: 'done',
                    label: 'Done',
                    icon: new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green')),
                    tasks: tasks.filter(t => t.status === 'done')
                }
            ];

            // Filter out empty groups (except Active, maybe, to show empty state?)
            // Keeping all for now so the structure is visible
            return groups;
        } catch (e) {
            return [];
        }
    }

    private getTaskIcon(status: string | undefined): vscode.ThemeIcon {
        if (!status) {
            return new vscode.ThemeIcon('circle-outline');
        }
        switch (status) {
            case 'ready': return new vscode.ThemeIcon('play-circle', new vscode.ThemeColor('charts.blue'));
            case 'agent_active': return new vscode.ThemeIcon('zap', new vscode.ThemeColor('charts.green'));
            case 'needs_feedback': return new vscode.ThemeIcon('bell', new vscode.ThemeColor('charts.orange'));
            case 'blocked': return new vscode.ThemeIcon('stop', new vscode.ThemeColor('charts.red'));
            case 'done': return new vscode.ThemeIcon('check'); // Gray/neutral - no color
            default: return new vscode.ThemeIcon('circle-outline');
        }
    }
}
