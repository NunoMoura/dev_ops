import * as vscode from 'vscode';
import { BoardItemNode } from './boardTreeProvider';
import { Board, Task } from '../features/types';
import { readBoard } from '../features/boardStore';

export type StatusGroupNode = {
    kind: 'group';
    id: string;
    label: string;
    description?: string;
    icon?: vscode.ThemeIcon;
    tasks: Task[];
};

export type ActionNode = {
    kind: 'action';
    id: string;
    label: string;
    command: string;
    icon: string;
};

export type StatusBoardNode = StatusGroupNode | BoardItemNode | ActionNode;

export class StatusBoardProvider implements vscode.TreeDataProvider<StatusBoardNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatusBoardNode | undefined | null | void> = new vscode.EventEmitter<StatusBoardNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatusBoardNode | undefined | null | void> = this._onDidChangeTreeData.event;
    private cachedBoard: Board | undefined;

    constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: StatusBoardNode): vscode.TreeItem {
        if (element.kind === 'action') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
            item.iconPath = new vscode.ThemeIcon(element.icon);
            item.command = {
                command: element.command,
                title: element.label
            };
            item.contextValue = 'dashboardAction';
            return item;
        } else if (element.kind === 'group') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
            item.description = `(${element.tasks.length})`;
            item.iconPath = element.icon || new vscode.ThemeIcon('list-tree');
            item.contextValue = 'statusGroup';
            return item;
        } else {
            const task = element.item;
            const columnName = element.column?.name || this.getColumnName(task.columnId);
            const item = new vscode.TreeItem(task.title, vscode.TreeItemCollapsibleState.None);
            item.id = task.id;
            // Enhanced tooltip with owner, phase, overview
            item.tooltip = this.buildEnhancedTooltip(task, columnName);
            item.contextValue = 'devopsTask';
            // Use bullet icon instead of chevron
            item.iconPath = new vscode.ThemeIcon('circle-small-filled', new vscode.ThemeColor('charts.purple'));

            item.command = {
                command: 'devops.showTaskDetails',
                title: 'Open Task',
                arguments: [task.id]
            };

            return item;
        }
    }

    getChildren(element?: StatusBoardNode): Thenable<StatusBoardNode[]> {
        if (!element) {
            return this.getRootNodes();
        } else if (element.kind === 'group') {
            return Promise.resolve(element.tasks.map(task => ({
                kind: 'item',
                item: task,
                column: { id: task.columnId, name: '', position: 0 }
            } as BoardItemNode)));
        }
        return Promise.resolve([]);
    }

    private async getRootNodes(): Promise<StatusBoardNode[]> {
        const nodes: StatusBoardNode[] = [];

        // Status Groups
        try {
            const board = await readBoard();
            this.cachedBoard = board;
            const tasks = board.items;

            // Define groups with explicit mapping
            // Traffic Light Logic: Red (Blocked), Yellow (Feedback), Blue (Ready), Green (Active), Grey (Done)

            const groups: StatusGroupNode[] = [
                {
                    kind: 'group',
                    id: 'blocked',
                    label: 'Blocked',
                    icon: new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red')),
                    tasks: tasks.filter(t => t.status === 'blocked')
                },
                {
                    kind: 'group',
                    id: 'feedback',
                    label: 'Needs Feedback',
                    icon: new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.orange')), // Orange/Yellow
                    tasks: tasks.filter(t => t.status === 'needs_feedback')
                },
                {
                    kind: 'group',
                    id: 'in_progress',
                    label: 'In Progress',
                    icon: new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green')),
                    tasks: tasks.filter(t => t.status === 'in_progress' || t.status === 'agent_active')
                },
                {
                    kind: 'group',
                    id: 'ready',
                    label: 'Ready',
                    icon: new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue')),
                    tasks: tasks.filter(t => t.status === 'ready')
                },
                {
                    kind: 'group',
                    id: 'done',
                    label: 'Done',
                    icon: new vscode.ThemeIcon('check', new vscode.ThemeColor('disabledForeground')),
                    tasks: tasks.filter(t => t.status === 'done')
                }
            ];

            // Only add non-empty groups? Or all? User wants visibility.
            // "It can be zeroed if nothing is happening, but the chart should appear."
            // So let's show all groups even if empty, to show the structure.
            nodes.push(...groups);

        } catch (e) {
            // ignore error
        }

        return nodes;
    }

    private getColumnName(columnId: string): string {
        if (!this.cachedBoard?.columns) {
            // Extract readable name from columnId like 'col-verify' -> 'Verify'
            return columnId.replace('col-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        const column = this.cachedBoard.columns.find(c => c.id === columnId);
        return column?.name || columnId.replace('col-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    private buildEnhancedTooltip(task: Task, columnName: string): vscode.MarkdownString {
        const lines: string[] = [
            `### ${task.title}`,
            '',
            `**Owner:** ${task.owner?.name || 'Unassigned'} (${task.owner?.type || 'none'})`,
            '',
            `**Phase:** ${columnName}`,
            '',
        ];

        if (task.summary) {
            lines.push(`**Overview:**`, '', task.summary, '');
        }

        lines.push('---', `*Click to open task details*`);

        const md = new vscode.MarkdownString(lines.join('\n'));
        md.isTrusted = true;
        return md;
    }
}
