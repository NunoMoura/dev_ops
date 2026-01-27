import * as vscode from 'vscode';
import * as path from 'path';
import { boardService } from '../../services/board/boardService';
import { log, warn, error as logError } from '../../common';

/**
 * Bridge between Antigravity sessions and board state.
 * 
 * - Detects session start (implementation_plan.md creation)
 * - Detects session completion (walkthrough.md creation) 
 * - Updates task status and agent registry via BoardService
 */
export class SessionBridge {
    private watcher: vscode.FileSystemWatcher | undefined;
    private readonly AG_BRAIN_PATTERN = '**/brain/*/walkthrough.md';
    // Also watch for plan creation to detect start
    private readonly AG_PLAN_PATTERN = '**/brain/*/implementation_plan.md';

    constructor(private readonly context: vscode.ExtensionContext) { }

    public activate() {
        log('SessionBridge: Activating watchers...');

        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) {
            warn('SessionBridge: Could not determine home directory.');
            return;
        }

        const brainDir = path.join(homeDir, '.gemini', 'antigravity', 'brain');

        // Watch for new walkthroughs (Session Complete)
        const walkthroughWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(brainDir, '**/walkthrough.md')
        );

        walkthroughWatcher.onDidCreate(uri => this.onWalkthroughCreated(uri));
        this.context.subscriptions.push(walkthroughWatcher);

        // Watch for new plans (Session Start)  
        const planWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(brainDir, '**/implementation_plan.md')
        );

        planWatcher.onDidCreate(uri => this.onPlanCreated(uri));
        this.context.subscriptions.push(planWatcher);

        log(`SessionBridge: Watching ${brainDir}`);
    }

    private async onPlanCreated(uri: vscode.Uri) {
        log(`SessionBridge: Detected new plan at ${uri.fsPath}`);

        const sessionId = this.extractSessionId(uri);
        if (!sessionId) { return; }

        try {
            // Get current task ID
            const taskId = await boardService.getCurrentTask();

            if (taskId) {
                // Claim task with session info
                await boardService.claimTask(taskId, {
                    driver: {
                        agent: 'Antigravity',
                        model: 'Antigravity',
                        sessionId: sessionId,
                    }
                });

                vscode.window.showInformationMessage(`🤖 Antigravity session started for ${taskId}`);
            }
        } catch (e) {
            logError('SessionBridge: Failed to handle plan creation', e);
        }
    }

    private async onWalkthroughCreated(uri: vscode.Uri) {
        log(`SessionBridge: Detected new walkthrough at ${uri.fsPath}`);

        const sessionId = this.extractSessionId(uri);
        if (!sessionId) { return; }

        try {
            const taskId = await boardService.getCurrentTask();

            if (taskId) {
                // Unclaim the task (session completed)
                await boardService.unclaimTask(taskId);

                vscode.window.showInformationMessage(`✅ Antigravity session completed for ${taskId}`);
            }
        } catch (e) {
            logError('SessionBridge: Failed to handle walkthrough creation', e);
        }
    }

    private extractSessionId(uri: vscode.Uri): string | null {
        // Expected: .../brain/{SESSION_ID}/filename.md
        const parts = uri.fsPath.split(path.sep);
        if (parts.length < 2) {
            return null;
        }
        return parts[parts.length - 2]; // Parent directory name
    }

    private getWorkspaceRoot(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
}

