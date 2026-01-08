import * as vscode from 'vscode';

/**
 * Action node for the Tasks view.
 */
export interface DevOpsActionNode {
    kind: 'action';
    id: string;
    label: string;
    icon: string;
    command: string;
    args?: unknown[];
}

/**
 * Filter chip node shown when a filter is active.
 */
export interface DevOpsFilterNode {
    kind: 'filter';
    id: string;
    label: string;
    filterText: string;
}

export type TasksNode = DevOpsActionNode | DevOpsFilterNode;

/**
 * Tree data provider for the Tasks section.
 * Shows Create Task, Search, and dynamic filter chips when active.
 */
export class TasksActionProvider implements vscode.TreeDataProvider<TasksNode> {
    private readonly onDidChangeEmitter = new vscode.EventEmitter<TasksNode | undefined>();
    readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

    private activeFilter: string | undefined;

    private readonly actions: DevOpsActionNode[] = [
        {
            kind: 'action',
            id: 'tasks-search',
            label: 'Search',
            icon: 'search',
            command: 'board.filterTasks',
        },
    ];

    setActiveFilter(filterText: string | undefined): void {
        this.activeFilter = filterText;
        this.onDidChangeEmitter.fire(undefined);
    }

    refresh(): void {
        this.onDidChangeEmitter.fire(undefined);
    }

    getChildren(): TasksNode[] {
        const nodes: TasksNode[] = [...this.actions];

        // Add filter chip if filter is active
        if (this.activeFilter) {
            nodes.push({
                kind: 'filter',
                id: 'tasks-active-filter',
                label: this.activeFilter,
                filterText: this.activeFilter,
            });
        }

        return nodes;
    }

    getTreeItem(element: TasksNode): vscode.TreeItem {
        if (element.kind === 'filter') {
            const item = new vscode.TreeItem(`🏷️ ${element.label}`, vscode.TreeItemCollapsibleState.None);
            item.id = element.id;
            item.description = '(click to clear)';
            item.iconPath = new vscode.ThemeIcon('close');
            item.command = {
                command: 'board.clearTaskFilter',
                title: 'Clear Filter',
            };
            item.contextValue = 'devopsFilter';
            return item;
        }

        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        item.id = element.id;
        item.iconPath = new vscode.ThemeIcon(element.icon);
        item.command = {
            command: element.command,
            title: element.label,
            arguments: element.args,
        };
        item.contextValue = 'devopsAction';
        return item;
    }
}
