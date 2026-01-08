import * as vscode from 'vscode';
import * as path from 'path';
import type { BoardTreeProvider, BoardNode } from '../../ui/board';
import type { DevOpsCommandServices } from './types';
import { registerDevOpsCommand, getTaskFromNode } from './utils';
import { readBoard, getWorkspaceRoot, runBoardOps } from '../../data';
import { promptForTask } from '../../domains/tasks';

/**
 * Register all workflow-related commands
 * These commands handle agent workflows: claiming, spawning, phase transitions
 */
export function registerWorkflowCommands(
    context: vscode.ExtensionContext,
    services: DevOpsCommandServices,
): void {
    const { provider } = services;

    registerDevOpsCommand(
        context,
        'devops.claimTask',
        async (node?: BoardNode) => {
            await handleClaimTaskViaPython(provider, node);
        },
        'Unable to claim task',
    );

    registerDevOpsCommand(
        context,
        'devops.spawnAgent',
        async () => {
            await handleSpawnAgent(provider);
        },
        'Unable to spawn agent',
    );

    registerDevOpsCommand(
        context,
        'devops.nextPhase',
        async (node?: BoardNode) => {
            await handleNextPhase(provider, node);
        },
        'Unable to move to next phase',
    );

    registerDevOpsCommand(
        context,
        'devops.retryPhase',
        async () => {
            await handleOpenWorkflow('retry_phase');
        },
        'Unable to open retry workflow',
    );

    registerDevOpsCommand(
        context,
        'devops.refinePhase',
        async () => {
            await handleRefinePhase(provider);
        },
        'Unable to refine phase',
    );
}

/**
 * Claim a task using Python CLI (board_ops.py claim)
 * Sets status to in_progress and updates .current_task file.
 */
async function handleClaimTaskViaPython(
    provider: BoardTreeProvider,
    node?: BoardNode,
): Promise<void> {
    const board = await readBoard();
    const task = node && node.kind === 'item' ? node.item : await promptForTask(board);
    if (!task) {
        return;
    }
    const cwd = getWorkspaceRoot();
    if (!cwd) {
        throw new Error('No workspace folder open');
    }

    const result = await runBoardOps(['claim', task.id], cwd);
    if (result.code !== 0) {
        throw new Error(result.stderr || `Failed to claim task: exit code ${result.code}`);
    }

    await provider.refresh();
    vscode.window.showInformationMessage(`✅ Claimed ${task.id}: ${task.title}`);
}

/**
 * Pick and claim the next highest priority task from Backlog
 * Wraps: board_ops.py pick --claim
 */
async function handleSpawnAgent(provider: BoardTreeProvider): Promise<void> {
    const cwd = getWorkspaceRoot();
    if (!cwd) {
        throw new Error('No workspace folder open');
    }

    const result = await runBoardOps(['pick', '--claim'], cwd);
    if (result.code !== 0) {
        if (result.stdout?.includes('No tasks available')) {
            vscode.window.showInformationMessage('ℹ️ No tasks available in Backlog');
            return;
        }
        throw new Error(result.stderr || `Failed to pick task: exit code ${result.code}`);
    }

    await provider.refresh();
    vscode.window.showInformationMessage(`▶ Task claimed! ${result.stdout.trim()}`);
}

/**
 * Move the current task to the next phase
 * Reads current column, calculates next column, then moves.
 */
async function handleNextPhase(
    provider: BoardTreeProvider,
    node?: BoardNode,
): Promise<void> {
    const board = await readBoard();
    const task = node && node.kind === 'item' ? node.item : await promptForTask(board);
    if (!task) {
        return;
    }

    // Find current column position
    const currentColumn = board.columns.find((c) => c.id === task.columnId);
    if (!currentColumn) {
        throw new Error('Task is in unknown column');
    }

    // Find next column
    const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);
    const currentIndex = sortedColumns.findIndex((c) => c.id === currentColumn.id);
    if (currentIndex === -1 || currentIndex >= sortedColumns.length - 1) {
        vscode.window.showInformationMessage(`${task.title} is already in the final phase`);
        return;
    }

    const nextColumn = sortedColumns[currentIndex + 1];
    const cwd = getWorkspaceRoot();
    if (!cwd) {
        throw new Error('No workspace folder open');
    }

    const result = await runBoardOps(['move', task.id, nextColumn.id], cwd);
    if (result.code !== 0) {
        throw new Error(result.stderr || `Failed to move task: exit code ${result.code}`);
    }

    await provider.refresh();
    vscode.window.showInformationMessage(`→ ${task.id} moved to ${nextColumn.name}`);
}

/**
 * Generate a refinement prompt with PM feedback
 * Prompts for feedback, calls CLI, and copies result to clipboard.
 */
async function handleRefinePhase(
    provider: BoardTreeProvider,
): Promise<void> {
    const cwd = getWorkspaceRoot();
    if (!cwd) {
        throw new Error('No workspace folder open');
    }

    // Get current task
    const currentTaskResult = await runBoardOps(['current-task'], cwd);
    const currentTaskId = currentTaskResult.stdout.trim();

    if (!currentTaskId || currentTaskId === 'No current task') {
        vscode.window.showWarningMessage('No active task. Use "Spawn Agent" first to claim a task.');
        return;
    }

    // Prompt for feedback
    const feedback = await vscode.window.showInputBox({
        prompt: 'Enter refinement feedback for the agent',
        placeHolder: 'e.g., "Focus more on error handling" or "Add tests for edge cases"',
        ignoreFocusOut: true,
    });

    if (!feedback) {
        return;
    }

    // Call CLI to generate prompt
    const result = await runBoardOps(['refine', currentTaskId, '--feedback', feedback], cwd);

    if (result.code !== 0) {
        throw new Error(result.stderr || `Failed to generate refinement prompt: exit code ${result.code}`);
    }

    // Extract prompt from output (between markers)
    const startMarker = '---PROMPT_START---';
    const endMarker = '---PROMPT_END---';
    const startIndex = result.stdout.indexOf(startMarker);
    const endIndex = result.stdout.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        throw new Error('Failed to parse refinement prompt from CLI output');
    }

    const prompt = result.stdout.substring(startIndex + startMarker.length, endIndex).trim();

    // Copy to clipboard
    await vscode.env.clipboard.writeText(prompt);

    // Notify user with action
    const action = await vscode.window.showInformationMessage(
        `Refinement prompt copied to clipboard. Paste it to start a new agent session.`,
        'Open New Chat',
    );

    if (action === 'Open New Chat') {
        // Try to open chat if available
        await vscode.commands.executeCommand('workbench.action.chat.open');
    }

    // Refresh views
    await provider.refresh();
}

/**
 * Open a workflow file for the user to execute
 */
async function handleOpenWorkflow(workflowName: string): Promise<void> {
    const cwd = getWorkspaceRoot();
    if (!cwd) {
        throw new Error('No workspace folder open');
    }

    const workflowPath = path.join(cwd, '.agent', 'workflows', `${workflowName}.md`);
    const uri = vscode.Uri.file(workflowPath);
    await vscode.commands.executeCommand('vscode.open', uri);
}
