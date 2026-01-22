import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { log, error as logError } from '../core';

/**
 * Integration with Cursor Background Tasks.
 * 
 * Cursor BG Tasks work via:
 * 1. Listening to changes in .cursor/tasks/
 * 2. Or being invoked via terminal commands (which we can assume the user might do)
 * 3. But here we implement the file-based "Push" model to signal Cursor.
 */
export class CursorBridge {
    private readonly TASKS_DIR = '.cursor/tasks';

    constructor(private context: vscode.ExtensionContext) { }

    public activate() {
        // Ensure .cursor/tasks exists
        const root = this.getWorkspaceRoot();
        if (root) {
            const tasksDir = path.join(root, this.TASKS_DIR);
            if (!fs.existsSync(tasksDir)) {
                try {
                    fs.mkdirSync(tasksDir, { recursive: true });
                    log(`CursorBridge: Created ${tasksDir}`);
                } catch (e) {
                    logError(`CursorBridge: Failed to create tasks dir`, e);
                }
            }
        }
    }

    /**
     * Spawns a background task for Cursor by creating a task definition file.
     */
    public async spawnBackgroundTask(taskId: string, phase: string): Promise<string | null> {
        const root = this.getWorkspaceRoot();
        if (!root) {
            throw new Error('No workspace open');
        }

        try {
            // Create task file content
            // Using VS Code command format instead of Python CLI
            const taskContent = {
                id: taskId,
                phase: phase,
                command: `vscode:devops.claimTask?${encodeURIComponent(JSON.stringify({ taskId }))}`,
                context: `Please work on task ${taskId} in phase ${phase}. Check board.json for details.`,
                status: 'pending',
                created: new Date().toISOString()
            };

            const fileName = `${taskId}.json`;
            const filePath = path.join(root, this.TASKS_DIR, fileName);

            fs.writeFileSync(filePath, JSON.stringify(taskContent, null, 2));

            vscode.window.showInformationMessage(`Cursor Task spawned: ${fileName}`);
            return filePath;

        } catch (error) {
            logError('CursorBridge: Failed to spawn task', error);
            vscode.window.showErrorMessage(`Failed to spawn Cursor task: ${String(error)}`);
            return null;
        }
    }

    private getWorkspaceRoot(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
}

