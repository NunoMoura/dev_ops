import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Node types for the Agent sidebar.
 */
export interface AgentCategoryNode {
    kind: 'category';
    id: string;
    label: string;
    directory: string;
    icon: string;
}

export interface AgentFileNode {
    kind: 'file';
    id: string;
    label: string;
    filePath: string;
    parentId: string;
}

export type AgentNode = AgentCategoryNode | AgentFileNode;

/**
 * Agent categories - workflows and rules from .agent folder.
 */
const AGENT_CATEGORIES: AgentCategoryNode[] = [
    { kind: 'category', id: 'workflows', label: 'Workflows', directory: 'workflows', icon: 'run-all' },
    { kind: 'category', id: 'rules', label: 'Rules', directory: 'rules', icon: 'law' },
];

/**
 * Tree data provider for the Agent section.
 * Shows workflows and rules from .agent folder (bootstrapped projects)
 * or root folders (dev_ops source project).
 */
export class AgentViewProvider implements vscode.TreeDataProvider<AgentNode> {
    private readonly onDidChangeEmitter = new vscode.EventEmitter<AgentNode | undefined>();
    readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

    private workspaceRoot: string | undefined;
    private agentPath: string | undefined;
    private useRootFolders: boolean = false;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders?.length) {
            this.workspaceRoot = folders[0].uri.fsPath;
            // Try .agent folder first (bootstrapped projects)
            const agentDir = path.join(this.workspaceRoot, '.agent');
            if (fs.existsSync(agentDir)) {
                this.agentPath = agentDir;
            } else {
                // Fallback to root folders (dev_ops source project)
                this.agentPath = this.workspaceRoot;
                this.useRootFolders = true;
            }
        }
    }

    refresh(): void {
        this.onDidChangeEmitter.fire(undefined);
    }

    getChildren(element?: AgentNode): AgentNode[] {
        if (!this.agentPath) {
            return [];
        }

        // Root level: show all categories (regardless of folder existence)
        if (!element) {
            return [...AGENT_CATEGORIES];
        }

        // Category level: show files
        if (element.kind === 'category') {
            const catPath = path.join(this.agentPath, element.directory);
            return this.getFiles(catPath, element.id);
        }

        return [];
    }

    private getFiles(folderPath: string, parentId: string): AgentFileNode[] {
        if (!fs.existsSync(folderPath)) {
            return [];
        }

        try {
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });
            const files: AgentFileNode[] = [];

            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.md')) {
                    files.push({
                        kind: 'file',
                        id: `${parentId}-${entry.name}`,
                        label: entry.name.replace('.md', ''),
                        filePath: path.join(folderPath, entry.name),
                        parentId: parentId,
                    });
                }
            }

            files.sort((a, b) => a.label.localeCompare(b.label));
            return files;
        } catch {
            return [];
        }
    }

    getTreeItem(element: AgentNode): vscode.TreeItem {
        if (element.kind === 'category') {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            item.id = element.id;
            item.iconPath = new vscode.ThemeIcon(element.icon);
            item.contextValue = 'agentCategory';
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
        item.contextValue = 'agentFile';
        item.tooltip = element.filePath;
        return item;
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

    // Watch for file changes in .agent directory
    const watcher = vscode.workspace.createFileSystemWatcher('**/.agent/**/*.md');
    watcher.onDidCreate(() => provider.refresh());
    watcher.onDidDelete(() => provider.refresh());
    watcher.onDidChange(() => provider.refresh());
    context.subscriptions.push(watcher);

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.refreshAgent', () => provider.refresh())
    );

    return provider;
}
