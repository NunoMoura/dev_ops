import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Node types for the UX sidebar.
 */
export interface UXActionNode {
    kind: 'action';
    id: string;
    label: string;
    icon: string;
    command: string;
}

export interface UXFileNode {
    kind: 'file';
    id: string;
    label: string;
    filePath: string;
}

export type UXNode = UXActionNode | UXFileNode;

/**
 * Tree data provider for the UX section.
 * Shows user personas, stories, mockups from dev_ops/docs/ux/.
 */
export class UXViewProvider implements vscode.TreeDataProvider<UXNode> {
    private readonly onDidChangeEmitter = new vscode.EventEmitter<UXNode | undefined>();
    readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

    private workspaceRoot: string | undefined;
    private uxPath: string | undefined;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders?.length) {
            this.workspaceRoot = folders[0].uri.fsPath;
            this.uxPath = path.join(this.workspaceRoot, 'dev_ops', 'docs', 'ux');
        }
    }

    refresh(): void {
        this.onDidChangeEmitter.fire(undefined);
    }

    getChildren(element?: UXNode): UXNode[] {
        if (!this.uxPath) {
            return [];
        }

        // Root level: show quick actions first, then files
        if (!element) {
            const actions: UXActionNode[] = [
                { kind: 'action', id: 'new-persona', label: 'New Persona', icon: 'add', command: 'devops.createUser' },
                { kind: 'action', id: 'new-story', label: 'New Story', icon: 'add', command: 'devops.createStory' },
            ];
            const files = this.getUXFiles();
            return [...actions, ...files];
        }

        return [];
    }

    private getUXFiles(): UXFileNode[] {
        if (!this.uxPath || !fs.existsSync(this.uxPath)) {
            return [];
        }

        try {
            const entries = fs.readdirSync(this.uxPath, { withFileTypes: true });
            const files: UXFileNode[] = [];

            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.md')) {
                    files.push({
                        kind: 'file',
                        id: `ux-${entry.name}`,
                        label: entry.name.replace('.md', ''),
                        filePath: path.join(this.uxPath, entry.name),
                    });
                }
            }

            files.sort((a, b) => a.label.localeCompare(b.label));
            return files;
        } catch {
            return [];
        }
    }

    getTreeItem(element: UXNode): vscode.TreeItem {
        if (element.kind === 'action') {
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
            item.id = element.id;
            item.iconPath = new vscode.ThemeIcon(element.icon);
            item.command = {
                command: element.command,
                title: element.label,
            };
            item.contextValue = 'uxAction';
            return item;
        }

        // File node
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        item.id = element.id;
        item.iconPath = new vscode.ThemeIcon('file');
        item.resourceUri = vscode.Uri.file(element.filePath);
        item.command = {
            command: 'markdown.showPreviewToSide',
            title: 'Open Document',
            arguments: [vscode.Uri.file(element.filePath)],
        };
        item.contextValue = 'uxFile';
        item.tooltip = element.filePath;
        return item;
    }

    getParent(): UXNode | undefined {
        return undefined;
    }
}

/**
 * Register the UX view provider.
 */
export function registerUXView(context: vscode.ExtensionContext): UXViewProvider {
    const provider = new UXViewProvider();

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('devopsUXView', provider)
    );

    // Watch for file changes in dev_ops/docs/ux directory
    const watcher = vscode.workspace.createFileSystemWatcher('**/dev_ops/docs/ux/**/*.md');
    watcher.onDidCreate(() => provider.refresh());
    watcher.onDidDelete(() => provider.refresh());
    watcher.onDidChange(() => provider.refresh());
    context.subscriptions.push(watcher);

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.refreshUX', () => provider.refresh())
    );

    return provider;
}
