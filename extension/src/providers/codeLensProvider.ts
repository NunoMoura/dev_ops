import * as vscode from 'vscode';
import { BoardApi, Task } from '../api/boardApi';

/**
 * CodeLens provider for DevOps task references.
 * Shows inline annotations for TASK-XXX references in code.
 */
export class DevOpsCodeLensProvider implements vscode.CodeLensProvider {
    private workspaceRoot: string | undefined;
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    // Regex to match TASK-XXX format
    private readonly taskRegex = /TASK-\d{3}/g;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            this.workspaceRoot = folders[0].uri.fsPath;
        }

        // Refresh CodeLens when board changes
        const boardWatcher = vscode.workspace.createFileSystemWatcher('**/dev_ops/board.json');
        boardWatcher.onDidChange(() => this.refresh());
        boardWatcher.onDidCreate(() => this.refresh());
        boardWatcher.onDidDelete(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    async provideCodeLenses(
        document: vscode.TextDocument
    ): Promise<vscode.CodeLens[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const taskIds = new Set<string>();

        // Find all task references
        let match;
        while ((match = this.taskRegex.exec(text)) !== null) {
            taskIds.add(match[0]);
        }

        // Create CodeLens for each unique task reference
        for (const taskId of taskIds) {
            try {
                const task = await BoardApi.getTask(taskId, this.workspaceRoot);
                if (task) {
                    // Find all occurrences of this task ID
                    const regex = new RegExp(taskId, 'g');
                    let occurrence;
                    while ((occurrence = regex.exec(text)) !== null) {
                        const startPos = document.positionAt(occurrence.index);
                        const endPos = document.positionAt(occurrence.index + taskId.length);
                        const range = new vscode.Range(startPos, endPos);

                        codeLenses.push(new vscode.CodeLens(range, {
                            title: this.formatTaskTitle(task),
                            tooltip: this.formatTaskTooltip(task),
                            command: 'kanban.showTaskDetails',
                            arguments: [taskId],
                        }));
                    }
                }
            } catch (error) {
                console.error(`Failed to get task ${taskId}:`, error);
            }
        }

        return codeLenses;
    }

    private formatTaskTitle(task: Task): string {
        const status = this.getStatusIcon(task.status || 'ready');
        const priority = task.priority ? ` [${task.priority.toUpperCase()}]` : '';
        return `${status} ${task.title}${priority}`;
    }

    private formatTaskTooltip(task: Task): string {
        const lines = [
            `Task: ${task.title}`,
            `ID: ${task.id}`,
            `Status: ${task.status || 'ready'}`,
            `Priority: ${task.priority}`,
        ];

        if (task.owner) {
            lines.push(`Owner: ${task.owner.name}`);
        }

        if (task.summary) {
            lines.push('', `Summary: ${task.summary.substring(0, 100)}...`);
        }

        return lines.join('\n');
    }

    private getStatusIcon(status: string): string {
        const icons: Record<string, string> = {
            'ready': '○',
            'agent_active': '◉',
            'needs_feedback': '◐',
            'blocked': '●',
            'done': '✓',
        };
        return icons[status] || '○';
    }
}

/**
 * Register the DevOps CodeLens provider.
 */
export function registerCodeLensProvider(context: vscode.ExtensionContext): void {
    const provider = new DevOpsCodeLensProvider();

    // Register for all file types
    const selector: vscode.DocumentSelector = { scheme: 'file' };

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(selector, provider)
    );

    // Add command to toggle CodeLens
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.toggleCodeLens', () => {
            const config = vscode.workspace.getConfiguration('devops');
            const current = config.get<boolean>('enableCodeLens', true);
            config.update('enableCodeLens', !current, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(
                `DevOps CodeLens ${!current ? 'enabled' : 'disabled'}`
            );
            provider.refresh();
        })
    );
}
