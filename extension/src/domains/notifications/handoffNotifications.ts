import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface Task {
    id: string;
    title: string;
    columnId: string;
    owner?: {
        type: string;
        name: string;
    };
}

interface Board {
    columns: Array<{ id: string; name: string }>;
    items: Task[];
}

/**
 * Monitors board.json for phase transitions and shows handoff notifications.
 */
export class HandoffNotificationService {
    private watcher: vscode.FileSystemWatcher | undefined;
    private previousBoard: Board | undefined;
    private boardPath: string | undefined;

    constructor(private context: vscode.ExtensionContext) { }

    public activate(workspaceRoot: string): void {
        // Locate board.json
        this.boardPath = this.findBoardPath(workspaceRoot);
        if (!this.boardPath) {
            return;
        }

        // Load initial state
        this.previousBoard = this.loadBoard(this.boardPath);

        // Watch for changes
        this.watcher = vscode.workspace.createFileSystemWatcher(this.boardPath);
        this.watcher.onDidChange(() => this.onBoardChanged());

        this.context.subscriptions.push(this.watcher);
    }

    private findBoardPath(workspaceRoot: string): string | undefined {
        const devOpsPath = path.join(workspaceRoot, '.dev_ops', 'board.json');
        const payloadPath = path.join(workspaceRoot, 'payload', 'board', 'board.json');

        if (fs.existsSync(devOpsPath)) {
            return devOpsPath;
        } else if (fs.existsSync(payloadPath)) {
            return payloadPath;
        }
        return undefined;
    }

    private loadBoard(boardPath: string): Board | undefined {
        try {
            const content = fs.readFileSync(boardPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to load board:', error);
            return undefined;
        }
    }

    private getColumnName(board: Board, columnId: string): string {
        const column = board.columns.find(c => c.id === columnId);
        return column?.name || 'Unknown';
    }

    private async onBoardChanged(): Promise<void> {
        if (!this.boardPath) {
            return;
        }

        const currentBoard = this.loadBoard(this.boardPath);
        if (!currentBoard || !this.previousBoard) {
            this.previousBoard = currentBoard;
            return;
        }

        // Detect phase transitions
        const previousTasks = new Map(this.previousBoard.items.map(t => [t.id, t]));

        for (const currentTask of currentBoard.items) {
            const previousTask = previousTasks.get(currentTask.id);

            // Check if task moved to a new phase AND has no active agent
            if (previousTask &&
                previousTask.columnId !== currentTask.columnId &&
                !currentTask.owner) {

                const fromPhase = this.getColumnName(this.previousBoard, previousTask.columnId);
                const toPhase = this.getColumnName(currentBoard, currentTask.columnId);

                this.showHandoffNotification(currentTask, fromPhase, toPhase);
            }
        }

        this.previousBoard = currentBoard;
    }

    private async showHandoffNotification(
        task: Task,
        fromPhase: string,
        toPhase: string
    ): Promise<void> {
        const message = `${task.id} ready for ${toPhase}. Continue?`;
        const action = await vscode.window.showInformationMessage(
            message,
            'Copy Command',
            'View Task',
            'Dismiss'
        );

        if (action === 'Copy Command') {
            const command = `/pick_task ${task.id}`;
            await vscode.env.clipboard.writeText(command);
            vscode.window.showInformationMessage(
                `Command copied! Open a new chat and paste.`
            );
        } else if (action === 'View Task') {
            // Trigger focus on the task in board view
            vscode.commands.executeCommand('devops.focusTask', task.id);
        }
    }

    public dispose(): void {
        this.watcher?.dispose();
    }
}
