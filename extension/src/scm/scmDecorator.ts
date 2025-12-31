import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SCM Decorator for DevOps framework.
 * Automatically prefixes commit messages with [TASK-XXX] based on current task.
 */
export class DevOpsSCMDecorator implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private workspaceRoot: string | undefined;
    private currentTaskPath: string | undefined;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            this.workspaceRoot = folders[0].uri.fsPath;
            this.currentTaskPath = path.join(this.workspaceRoot, 'dev_ops', '.current_task');
        }

        this.setupSCMInputProvider();
    }

    private setupSCMInputProvider(): void {
        // Get the Git extension API
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            console.warn('Git extension not found - SCM decorations disabled');
            return;
        }

        // Register SCM input box provider
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(async (event) => {
                // Check if this is the SCM input box
                if (event.document.uri.scheme === 'vscode-scm') {
                    await this.decorateCommitMessage(event.document);
                }
            })
        );
    }

    private async decorateCommitMessage(document: vscode.TextDocument): Promise<void> {
        const currentTaskId = this.getCurrentTaskId();
        if (!currentTaskId) {
            return;
        }

        const text = document.getText();

        // Don't modify if already has task ID
        if (text.includes(`[${currentTaskId}]`) || text.includes(currentTaskId)) {
            return;
        }

        // Don't modify if user has already started typing
        if (text.trim().length > 0) {
            return;
        }

        // Insert task ID prefix
        const prefix = `[${currentTaskId}] `;

        // Use workspace edit to modify the SCM input
        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, new vscode.Position(0, 0), prefix);

        try {
            await vscode.workspace.applyEdit(edit);
        } catch (error) {
            console.error('Failed to decorate commit message:', error);
        }
    }

    private getCurrentTaskId(): string | null {
        if (!this.currentTaskPath || !fs.existsSync(this.currentTaskPath)) {
            return null;
        }

        try {
            const taskId = fs.readFileSync(this.currentTaskPath, 'utf8').trim();
            return taskId || null;
        } catch (error) {
            console.error('Failed to read current task:', error);
            return null;
        }
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}

/**
 * Alternative implementation using Git extension API directly
 */
export class DevOpsGitInputProvider {
    private workspaceRoot: string | undefined;
    private currentTaskPath: string | undefined;
    private gitAPI: any;

    constructor(context: vscode.ExtensionContext) {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            this.workspaceRoot = folders[0].uri.fsPath;
            this.currentTaskPath = path.join(this.workspaceRoot, 'dev_ops', '.current_task');
        }

        this.initializeGitAPI(context);
    }

    private async initializeGitAPI(context: vscode.ExtensionContext): Promise<void> {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            return;
        }

        if (!gitExtension.isActive) {
            await gitExtension.activate();
        }

        this.gitAPI = gitExtension.exports.getAPI(1);

        if (this.gitAPI && this.gitAPI.repositories.length > 0) {
            this.setupInputBoxProvider();
        }
    }

    private setupInputBoxProvider(): void {
        const repository = this.gitAPI.repositories[0];

        // Set input box provider
        repository.inputBox.value = this.getCommitMessageTemplate();
    }

    private getCommitMessageTemplate(): string {
        const taskId = this.getCurrentTaskId();
        if (taskId) {
            return `[${taskId}] `;
        }
        return '';
    }

    private getCurrentTaskId(): string | null {
        if (!this.currentTaskPath || !fs.existsSync(this.currentTaskPath)) {
            return null;
        }

        try {
            const taskId = fs.readFileSync(this.currentTaskPath, 'utf8').trim();
            return taskId || null;
        } catch (error) {
            return null;
        }
    }
}

/**
 * Register SCM decorations.
 */
export function registerSCMDecorations(context: vscode.ExtensionContext): void {
    // Try the Git API approach first
    const gitProvider = new DevOpsGitInputProvider(context);

    // Also register the document-based decorator as fallback
    const decorator = new DevOpsSCMDecorator();
    context.subscriptions.push(decorator);

    // Add command to manually insert task ID in commit message
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.insertTaskInCommit', async () => {
            const folders = vscode.workspace.workspaceFolders;
            if (!folders || folders.length === 0) {
                return;
            }

            const currentTaskPath = path.join(folders[0].uri.fsPath, 'dev_ops', '.current_task');
            if (!fs.existsSync(currentTaskPath)) {
                vscode.window.showWarningMessage('No current task found');
                return;
            }

            const taskId = fs.readFileSync(currentTaskPath, 'utf8').trim();
            if (!taskId) {
                vscode.window.showWarningMessage('No current task found');
                return;
            }

            // Try to get Git extension
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                vscode.window.showErrorMessage('Git extension not found');
                return;
            }

            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }

            const gitAPI = gitExtension.exports.getAPI(1);
            if (gitAPI && gitAPI.repositories.length > 0) {
                const repository = gitAPI.repositories[0];
                const currentMessage = repository.inputBox.value;

                // Only prepend if not already present
                if (!currentMessage.includes(`[${taskId}]`) && !currentMessage.includes(taskId)) {
                    repository.inputBox.value = `[${taskId}] ${currentMessage}`;
                }
            }
        })
    );
}
