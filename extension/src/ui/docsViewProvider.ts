import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Node types for the Docs sidebar.
 */
export interface DocsCategoryNode {
    kind: 'category';
    id: string;
    label: string;
    directory: string;
    icon: string;
}

export interface DocsFolderNode {
    kind: 'folder';
    id: string;
    label: string;
    folderPath: string;
    parentPath: string;
}

export interface DocsFileNode {
    kind: 'file';
    id: string;
    label: string;
    filePath: string;
    parentId: string;
}

export type DocsNode = DocsCategoryNode | DocsFolderNode | DocsFileNode;

/**
 * Document categories - only user-facing ones shown in UI.
 * Agent artifacts (research, plans, reviews, tests, completions) are accessed via component docs.
 */
const DOC_CATEGORIES: DocsCategoryNode[] = [
    { kind: 'category', id: 'architecture', label: 'Architecture', directory: 'architecture', icon: 'symbol-structure' },
    { kind: 'category', id: 'prds', label: 'PRDs', directory: 'prds', icon: 'file-text' },
    { kind: 'category', id: 'features', label: 'Features', directory: 'features', icon: 'list-unordered' },
    { kind: 'category', id: 'bugs', label: 'Bugs', directory: 'bugs', icon: 'bug' },
];

/**
 * Tree data provider for the Docs section.
 * Architecture shows folder hierarchy mirroring src/.
 * Other categories show flat file lists.
 */
export class DocsViewProvider implements vscode.TreeDataProvider<DocsNode> {
    private readonly onDidChangeEmitter = new vscode.EventEmitter<DocsNode | undefined>();
    readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

    private workspaceRoot: string | undefined;
    private devOpsPath: string | undefined;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders?.length) {
            this.workspaceRoot = folders[0].uri.fsPath;
            this.devOpsPath = path.join(this.workspaceRoot, 'dev_ops');
        }
    }

    refresh(): void {
        this.onDidChangeEmitter.fire(undefined);
    }

    getChildren(element?: DocsNode): DocsNode[] {
        if (!this.devOpsPath) {
            return [];
        }

        // Root level: show categories
        if (!element) {
            return DOC_CATEGORIES.filter(cat => {
                const catPath = path.join(this.devOpsPath!, cat.directory);
                return fs.existsSync(catPath);
            });
        }

        // Category level
        if (element.kind === 'category') {
            const catPath = path.join(this.devOpsPath, element.directory);

            // Architecture: show hierarchical folders
            if (element.id === 'architecture') {
                return this.getHierarchicalChildren(catPath, element.id);
            }

            // Other categories: flat list of files
            return this.getFlatFiles(catPath, element.id);
        }

        // Folder level: show subfolders and files
        if (element.kind === 'folder') {
            return this.getHierarchicalChildren(element.folderPath, element.id);
        }

        return [];
    }

    /**
     * Get hierarchical children (folders + files) for architecture.
     */
    private getHierarchicalChildren(folderPath: string, parentId: string): DocsNode[] {
        if (!fs.existsSync(folderPath)) {
            return [];
        }

        try {
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });
            const nodes: DocsNode[] = [];

            // Add subfolders first
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    const subPath = path.join(folderPath, entry.name);
                    nodes.push({
                        kind: 'folder',
                        id: `${parentId}/${entry.name}`,
                        label: entry.name,
                        folderPath: subPath,
                        parentPath: folderPath,
                    });
                }
            }

            // Then add files
            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.md')) {
                    nodes.push({
                        kind: 'file',
                        id: `${parentId}/${entry.name}`,
                        label: entry.name.replace('.md', ''),
                        filePath: path.join(folderPath, entry.name),
                        parentId: parentId,
                    });
                }
            }

            // Sort: folders first, then files
            nodes.sort((a, b) => {
                if (a.kind !== b.kind) {
                    return a.kind === 'folder' ? -1 : 1;
                }
                return a.label.localeCompare(b.label);
            });

            return nodes;
        } catch {
            return [];
        }
    }

    /**
     * Get flat list of files for non-architecture categories.
     */
    private getFlatFiles(catPath: string, categoryId: string): DocsFileNode[] {
        if (!fs.existsSync(catPath)) {
            return [];
        }

        try {
            const entries = fs.readdirSync(catPath, { withFileTypes: true });
            const files: DocsFileNode[] = [];

            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.md')) {
                    files.push({
                        kind: 'file',
                        id: `${categoryId}-${entry.name}`,
                        label: entry.name.replace('.md', ''),
                        filePath: path.join(catPath, entry.name),
                        parentId: categoryId,
                    });
                }
            }

            files.sort((a, b) => a.label.localeCompare(b.label));
            return files;
        } catch {
            return [];
        }
    }

    getTreeItem(element: DocsNode): vscode.TreeItem {
        if (element.kind === 'category') {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            item.id = element.id;
            item.iconPath = new vscode.ThemeIcon(element.icon);
            item.contextValue = 'docsCategory';
            return item;
        }

        if (element.kind === 'folder') {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            item.id = element.id;
            item.iconPath = new vscode.ThemeIcon('folder');
            item.contextValue = 'docsFolder';
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
        item.contextValue = 'docsFile';
        item.tooltip = element.filePath;
        return item;
    }

    getParent(element: DocsNode): DocsNode | undefined {
        // Not implementing full parent tracking for simplicity
        return undefined;
    }
}

/**
 * Register the Docs view provider.
 */
export function registerDocsView(context: vscode.ExtensionContext): DocsViewProvider {
    const provider = new DocsViewProvider();

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('devopsDocsView', provider)
    );

    // Watch for file changes in dev_ops directory
    const watcher = vscode.workspace.createFileSystemWatcher('**/dev_ops/**/*.md');
    watcher.onDidCreate(() => provider.refresh());
    watcher.onDidDelete(() => provider.refresh());
    watcher.onDidChange(() => provider.refresh());
    context.subscriptions.push(watcher);

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.refreshDocs', () => provider.refresh())
    );

    return provider;
}
