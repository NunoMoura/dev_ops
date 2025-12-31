import * as vscode from 'vscode';
import * as path from 'path';
import { runBoardOps } from '../handlers/pythonRunner';
import { log, warn, error as logError } from './logger';

/**
 * Bridge between Antigravity sessions and board state.
 * 
 * - Detects session start (implementation_plan.md creation)
 * - Detects session completion (walkthrough.md creation) 
 * - Updates task status and agent registry via board_ops.py
 */
export class SessionBridge {
    private watcher: vscode.FileSystemWatcher | undefined;
    private readonly AG_BRAIN_PATTERN = '**/brain/*/walkthrough.md';
    // Also watch for plan creation to detect start
    private readonly AG_PLAN_PATTERN = '**/brain/*/implementation_plan.md';

    constructor(private readonly context: vscode.ExtensionContext) { }

    public activate() {
        log('SessionBridge: Activating watchers...');

        // We need to watch the global Antigravity brain directory
        // Since it's outside the workspace, we might need a specific pattern
        // Ideally, we watch the user's home .gemini dir if possible, 
        // or just rely on the fact that if they open the brain folder we catch it.
        // BUT, "local" Antigravity usually means we are editing files IN the workspace
        // while the artifacts are stored in .gemini.

        // WARNING: `vscode.workspace.createFileSystemWatcher` with a relative pattern
        // requires a workspace folder. With a glob pattern, it watches within the workspace.
        // To watch external files, we need to ensure we have access.
        // However, if the user is running Antigravity, the artifacts are written to `~/.gemini/...`
        // which might NOT be in the current VS Code workspace.

        // Strategy: 
        // If we can't easily watch external paths, we might need to rely on 
        // the fact that we (the agent) are creating these files.
        // But this bridge is for the USER's VS Code extension to see what the AGENT is doing.

        // Let's try watching a specific absolute path pattern if possible.
        // VS Code API says GlobPattern can be a string (file path).

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
        // Session Started
        // 1. Parse session ID from path (.../brain/{APP_ID}/{SESSION_ID}/implementation_plan.md)
        // Actually typically: .../brain/{SESSION_ID}/implementation_plan.md

        const sessionId = this.extractSessionId(uri);
        if (!sessionId) { return; }

        // 2. Identify which task this session belongs to.
        // We can check if there's a claimed status or if we can read the plan to find a task ID?
        // Or we simply check what is the ".current_task" in the project and register this session to it.

        const cwd = this.getWorkspaceRoot();
        if (!cwd) { return; }

        try {
            // Get current task ID
            const taskIdResult = await runBoardOps(['current-task'], cwd);
            const taskId = taskIdResult.stdout.trim();

            if (taskId && taskId !== 'No current task') {
                // Register agent on this task
                await runBoardOps([
                    'register',
                    taskId,
                    '--type', 'antigravity',
                    '--session-id', sessionId,
                    '--name', 'Antigravity' // Could be dynamic
                ], cwd);

                vscode.window.showInformationMessage(`🤖 Antigravity session started for ${taskId}`);
            }
        } catch (e) {
            logError('SessionBridge: Failed to handle plan creation', e);
        }
    }

    private async onWalkthroughCreated(uri: vscode.Uri) {
        log(`SessionBridge: Detected new walkthrough at ${uri.fsPath}`);
        // Session Complete

        const sessionId = this.extractSessionId(uri);
        if (!sessionId) { return; }

        const cwd = this.getWorkspaceRoot();
        if (!cwd) { return; }

        try {
            // We need to find which task has this session ID?
            // Or just unregister the current task's agent?
            // Let's rely on finding the task that owns this session.
            // But `unregister_agent` just takes a taskId. 
            // We'll assume the currently active task is the one finishing.
            // A more robust way would be to search board for this sessionId.
            // For now, let's unregister from current task if it matches.

            const taskIdResult = await runBoardOps(['current-task'], cwd);
            const taskId = taskIdResult.stdout.trim();

            if (taskId && taskId !== 'No current task') {
                // Optionally verified session ID matches?
                // For now, just unregister
                await runBoardOps(['unregister', taskId], cwd);

                // Also record phase session?
                // We don't verify which phase it was, assume it matches what the task was in.
                // await runBoardOps(['record-phase', taskId, ...], cwd);

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
