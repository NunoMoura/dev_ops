import * as vscode from 'vscode';
import { runBoardOps } from '../handlers/pythonRunner';

/**
 * Archive Provider - Tree view of completed tasks
 * 
 * Features:
 * - 3-level tree: Months → Tasks → Artifacts
 * - Click task to expand artifacts
 * - Click artifact to open in new tab
 * - Search functionality
 * - Auto-refresh on archive
 */
export class ArchiveProvider implements vscode.TreeDataProvider<ArchiveItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ArchiveItem | undefined | null | void> = new vscode.EventEmitter<ArchiveItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ArchiveItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _archives: any[] = [];

    constructor() {
        this._loadArchives();
    }

    refresh(): void {
        this._loadArchives();
        this._onDidChangeTreeData.fire();
    }

    private async _loadArchives() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        try {
            // Call Python CLI to list archives
            const result = await runBoardOps(['list-archives'], workspaceFolder.uri.fsPath);
            if (result.code === 0 && result.stdout) {
                this._archives = JSON.parse(result.stdout);
            }
        } catch (error) {
            // Archive system not yet implemented in Python
            this._archives = [];
        }
    }

    getTreeItem(element: ArchiveItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ArchiveItem): Thenable<ArchiveItem[]> {
        if (!element) {
            // Root level: show months
            return Promise.resolve(this._getMonthNodes());
        } else if (element.type === 'month') {
            // Month level: show tasks
            return Promise.resolve(this._getTaskNodes(element.month!));
        } else if (element.type === 'task') {
            // Task level: show artifacts
            return Promise.resolve(this._getArtifactNodes(element.taskId!));
        }

        return Promise.resolve([]);
    }

    private _getMonthNodes(): ArchiveItem[] {
        // Group archives by month
        const monthGroups = new Map<string, any[]>();

        this._archives.forEach(archive => {
            const date = new Date(archive.completedAt || Date.now());
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthGroups.has(monthKey)) {
                monthGroups.set(monthKey, []);
            }
            monthGroups.get(monthKey)!.push(archive);
        });

        // Convert to tree items
        return Array.from(monthGroups.entries())
            .sort((a, b) => b[0].localeCompare(a[0])) // Most recent first
            .map(([month, archives]) => {
                const label = `${month} (${archives.length} tasks)`;
                return new ArchiveItem(
                    label,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'month',
                    month
                );
            });
    }

    private _getTaskNodes(month: string): ArchiveItem[] {
        const tasksInMonth = this._archives.filter(archive => {
            const date = new Date(archive.completedAt || Date.now());
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return monthKey === month;
        });

        return tasksInMonth.map(archive => {
            const label = `✓ ${archive.taskId}: ${archive.title}`;
            const item = new ArchiveItem(
                label,
                vscode.TreeItemCollapsibleState.Collapsed,
                'task',
                undefined,
                archive.taskId,
                archive
            );

            item.tooltip = `Completed: ${new Date(archive.completedAt).toLocaleDateString()}`;
            return item;
        });
    }

    private _getArtifactNodes(taskId: string): ArchiveItem[] {
        const archive = this._archives.find(a => a.taskId === taskId);
        if (!archive || !archive.artifacts) {
            return [];
        }

        return archive.artifacts.map((artifactId: string) => {
            const item = new ArchiveItem(
                `📄 ${artifactId}`,
                vscode.TreeItemCollapsibleState.None,
                'artifact',
                undefined,
                taskId,
                undefined,
                artifactId
            );

            // Make artifact clickable - extract and open
            item.command = {
                command: 'devops.openArchivedArtifact',
                title: 'Open Artifact',
                arguments: [taskId, artifactId]
            };

            return item;
        });
    }
}

class ArchiveItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'month' | 'task' | 'artifact',
        public readonly month?: string,
        public readonly taskId?: string,
        public readonly archive?: any,
        public readonly artifactId?: string
    ) {
        super(label, collapsibleState);

        if (type === 'month') {
            this.iconPath = new vscode.ThemeIcon('calendar');
        } else if (type === 'task') {
            this.iconPath = new vscode.ThemeIcon('archive');
        } else if (type === 'artifact') {
            this.iconPath = new vscode.ThemeIcon('file');
        }
    }
}

export function registerArchive(context: vscode.ExtensionContext): ArchiveProvider {
    const provider = new ArchiveProvider();

    const treeView = vscode.window.createTreeView('devopsArchive', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    context.subscriptions.push(treeView);

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.refreshArchive', () => {
            provider.refresh();
        })
    );

    // Register open artifact command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.openArchivedArtifact', async (taskId: string, artifactId: string) => {
            // TODO: Extract archive and open artifact
            vscode.window.showInformationMessage(`Opening ${artifactId} from ${taskId}`);
        })
    );

    return provider;
}
