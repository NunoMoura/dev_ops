import * as vscode from 'vscode';
import * as path from 'path';
import type { BoardTreeProvider, BoardNode } from '../../ui/board';
import type { DevOpsCommandServices } from './types';
import { registerDevOpsCommand, getTaskFromNode } from './utils';
import { readBoard, getWorkspaceRoot, boardService } from '../../data';
import { promptForTask } from '../../services/tasks';

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
 * Pick and claim the next highest priority task from Backlog
 */
async function handleSpawnAgent(provider: BoardTreeProvider): Promise<void> {
    const taskId = await boardService.pickAndClaimTask({ name: 'Agent' });

    if (!taskId) {
        vscode.window.showInformationMessage('ℹ️ No tasks available in Backlog');
        return;
    }

    await provider.refresh();
    vscode.window.showInformationMessage(`▶ Task claimed: ${taskId}`);
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

    await boardService.moveTask(task.id, nextColumn.id);

    await provider.refresh();
    vscode.window.showInformationMessage(`→ ${task.id} moved to ${nextColumn.name}`);
}

/**
 * Generate a refinement prompt with PM feedback
 * Simplified to just prompt for feedback and generate a prompt locally.
 */
async function handleRefinePhase(
    provider: BoardTreeProvider,
): Promise<void> {
    // Get current task
    const currentTaskId = await boardService.getCurrentTask();

    if (!currentTaskId) {
        vscode.window.showWarningMessage('No active task. Use "Spawn Agent" first to claim a task.');
        return;
    }

    // Get task details
    const task = await boardService.getTask(currentTaskId);
    if (!task) {
        vscode.window.showWarningMessage('Current task not found on board.');
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

    // Generate refinement prompt locally
    const prompt = `# Refinement Request for ${task.id}

## Task: ${task.title}

${task.summary || ''}

## Feedback from PM

${feedback}

## Instructions

Please review the feedback above and refine your approach. Consider:
1. Address the specific points mentioned in the feedback
2. Review your previous artifacts and update them if needed
3. Continue with the current phase incorporating this guidance
`;

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

