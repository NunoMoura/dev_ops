import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Document category in the Docs sidebar.
 */
export interface DocsCategoryNode {
    kind: 'category';
    id: string;
    label: string;
    directory: string;
    prefix: string;
    icon: string;
}

/**
 * Individual document file.
 */
export interface DocsFileNode {
    kind: 'file';
    id: string;
    label: string;
    filePath: string;
    category: string;
}

export type DocsNode = DocsCategoryNode | DocsFileNode;

/**
 * Document categories aligned with dev_ops structure.
 */
const DOC_CATEGORIES: DocsCategoryNode[] = [
    { kind: 'category', id: 'prds', label: 'PRDs', directory: 'prds', prefix: 'PRD-', icon: 'file-text' },
    { kind: 'category', id: 'features', label: 'Features', directory: 'features', prefix: 'FEAT-', icon: 'list-unordered' },
    { kind: 'category', id: 'research', label: 'Research', directory: 'research', prefix: 'RES-', icon: 'lightbulb' },
    { kind: 'category', id: 'plans', label: 'Plans', directory: 'plans', prefix: 'PLN-', icon: 'checklist' },
    { kind: 'category', id: 'architecture', label: 'Architecture', directory: 'architecture', prefix: '', icon: 'symbol-structure' },
    { kind: 'category', id: 'reviews', label: 'Reviews', directory: 'reviews', prefix: 'REV-', icon: 'comment-discussion' },
    { kind: 'category', id: 'tests', label: 'Tests', directory: 'tests', prefix: 'TST-', icon: 'beaker' },
    { kind: 'category', id: 'bugs', label: 'Bugs', directory: 'bugs', prefix: 'BUG-', icon: 'bug' },
    { kind: 'category', id: 'completions', label: 'Completions', directory: 'completions', prefix: 'COMP-', icon: 'check' },
];

/**
 * Tree data provider for the Docs section.
 * Shows categories -> files hierarchy.
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

        // Category level: show files
        if (element.kind === 'category') {
            return this.getFilesInCategory(element);
        }

        return [];
    }

    private getFilesInCategory(category: DocsCategoryNode): DocsFileNode[] {
        if (!this.devOpsPath) {
            return [];
        }

        const catPath = path.join(this.devOpsPath, category.directory);
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
                        id: `${category.id}-${entry.name}`,
                        label: entry.name.replace('.md', ''),
                        filePath: path.join(catPath, entry.name),
                        category: category.id,
                    });
                }
            }

            // Sort by name
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
        if (element.kind === 'file') {
            return DOC_CATEGORIES.find(cat => cat.id === element.category);
        }
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
