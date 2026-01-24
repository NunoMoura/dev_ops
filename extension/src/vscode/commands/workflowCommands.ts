import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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
        'devops.refinePhase',
        async () => {
            await handleRefinePhase();
        },
        'Unable to start refine phase',
    );

    registerDevOpsCommand(
        context,
        'devops.retryPhase',
        async () => {
            await handleRetryPhase();
        },
        'Unable to retry phase',
    );

    registerDevOpsCommand(
        context,
        'devops.openPhaseSkill',
        async () => {
            await handleOpenPhaseSkill();
        },
        'Unable to open phase skill',
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
    vscode.window.showInformationMessage(`→ ${task.id} moved to ${nextColumn.name}`);
}

async function handleRefinePhase(): Promise<void> {
    const rootPath = getWorkspaceRoot();
    if (!rootPath) {
        vscode.window.showErrorMessage('No workspace open');
        return;
    }
    const rootUri = vscode.Uri.file(rootPath);
    const uri = vscode.Uri.joinPath(rootUri, 'payload', 'workflows', 'refine.md');
    await vscode.commands.executeCommand('markdown.showPreview', uri);
    vscode.window.showInformationMessage('Ralph Wiggum Loop: Refine Phase Initiated');
}

async function handleRetryPhase(): Promise<void> {
    const rootPath = getWorkspaceRoot();
    if (!rootPath) {
        vscode.window.showErrorMessage('No workspace open');
        return;
    }
    const rootUri = vscode.Uri.file(rootPath);
    const uri = vscode.Uri.joinPath(rootUri, 'payload', 'workflows', 'retry.md');
    await vscode.commands.executeCommand('markdown.showPreview', uri);
    vscode.window.showInformationMessage('Ralph Wiggum Loop: Retry Phase Initiated');
}

/**
 * Open the Skill definition for a specific phase
 */
async function handleOpenPhaseSkill(): Promise<void> {
    const rootPath = getWorkspaceRoot();
    if (!rootPath) {
        vscode.window.showErrorMessage('No workspace open');
        return;
    }

    const phases = ['Bootstrap', 'Understand', 'Plan', 'Build', 'Verify', 'Release'];
    const selected = await vscode.window.showQuickPick(phases, {
        placeHolder: 'Select phase to view skill instructions'
    });

    if (!selected) { return; }

    const skillName = selected.toLowerCase();

    // Check .agent/skills (Antigravity) then .cursor/skills (Cursor)
    const agentSkillPath = path.join(rootPath, '.agent', 'skills', skillName, 'SKILL.md');
    const cursorSkillPath = path.join(rootPath, '.cursor', 'skills', skillName, 'SKILL.md');

    let uri: vscode.Uri | undefined;

    if (fs.existsSync(agentSkillPath)) {
        uri = vscode.Uri.file(agentSkillPath);
    } else if (fs.existsSync(cursorSkillPath)) {
        uri = vscode.Uri.file(cursorSkillPath);
    } else {
        // Fallback to checking extension assets if not in project? 
        // Or specific locations.
        // For now, warn if not found.
        vscode.window.showWarningMessage(`SKILL.md not found for ${selected} in .agent/skills or .cursor/skills`);
        return;
    }

    await vscode.workspace.openTextDocument(uri).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}
