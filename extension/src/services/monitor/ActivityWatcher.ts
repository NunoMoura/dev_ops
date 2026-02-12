import * as vscode from 'vscode';
import * as path from 'path';
import { BoardService } from '../board/boardService';
import { Board } from '../../types';

export class ActivityWatcher implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private _isActive = true;

    constructor(
        private boardService: BoardService
    ) {
        this.setupWatchers();
    }

    private setupWatchers() {
        // Watch for file creation
        this.disposables.push(
            vscode.workspace.onDidCreateFiles(async (e) => {
                await this.handleFileActivity(e.files);
            })
        );

        // Watch for file changes (saving)
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(async (doc) => {
                await this.handleFileActivity([doc.uri]);
            })
        );
    }

    private async handleFileActivity(uris: readonly vscode.Uri[]) {
        if (!this._isActive) { return; }

        // Filter for relevant code files (ignore docs, logs, dotfiles)
        const codeFiles = uris.filter(uri => this.isImplementationFile(uri));
        if (codeFiles.length === 0) { return; }

        // Check current task phase
        const currentTaskId = await this.boardService.getCurrentTask();
        if (!currentTaskId) { return; }

        const currentTask = await this.boardService.getTask(currentTaskId);
        if (!currentTask) { return; }

        // If in Plan or Understand phase -> Promote to Implement
        if (currentTask.columnId === 'col-plan' || currentTask.columnId === 'col-understand') {
            await this.promoteToImplement(currentTask.id);
        }
    }

    private isImplementationFile(uri: vscode.Uri): boolean {
        const fsPath = uri.fsPath;
        const basename = path.basename(fsPath);

        // Ignore strictly non-code files
        if (basename.endsWith('.md') || basename.endsWith('.txt') || basename.endsWith('.json')) {
            return false;
        }

        // Ignore dot folders/files
        if (fsPath.includes('/.') || basename.startsWith('.')) {
            return false;
        }

        return true;
    }

    private async promoteToImplement(taskId: string) {
        // Silent promotion
        await this.boardService.moveTask(taskId, 'col-implement');

        // Subtle notification
        vscode.window.showInformationMessage(`Implementation started. Task ${taskId} moved to Implement phase.`);
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
