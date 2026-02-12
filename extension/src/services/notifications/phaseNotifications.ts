/**
 * Phase Notifications
 *
 * Shows notifications when tasks are moved between phases,
 * prompting the user to open a new agent session.
 */

import * as vscode from 'vscode';

/**
 * Column ID to phase name and position mapping.
 */
const PHASE_INFO: Record<string, { name: string; position: number }> = {
    'col-backlog': { name: 'Backlog', position: 1 },
    'col-understand': { name: 'Understand', position: 2 },
    'col-plan': { name: 'Plan', position: 3 },
    'col-implement': { name: 'Implement', position: 4 },
    'col-verify': { name: 'Verify', position: 5 },
    'col-done': { name: 'Done', position: 6 },
};

/**
 * Check if movement is backward (e.g., Implement → Plan).
 */
function isBackwardMovement(fromColumnId: string | undefined, toColumnId: string): boolean {
    if (!fromColumnId) {
        return false;
    }
    const fromPos = PHASE_INFO[fromColumnId]?.position ?? 0;
    const toPos = PHASE_INFO[toColumnId]?.position ?? 0;
    return toPos < fromPos;
}

/**
 * Get the appropriate workflow for a phase transition.
 */
function getWorkflowForPhase(
    fromColumnId: string | undefined,
    toColumnId: string
): { workflow: string; isBackward: boolean } | undefined {
    // Moving to Done: no workflow needed
    if (toColumnId === 'col-done') {
        return undefined;
    }

    // Moving to Backlog: no workflow
    if (toColumnId === 'col-backlog') {
        return undefined;
    }

    const toPhase = PHASE_INFO[toColumnId]?.name;
    const fromPhase = fromColumnId ? PHASE_INFO[fromColumnId]?.name : undefined;

    const backward = isBackwardMovement(fromColumnId, toColumnId);

    // From Backlog → first active phase: use pick_task
    if (fromPhase === 'Backlog' && toPhase === 'Understand') {
        return { workflow: 'claim_task', isBackward: false };
    }

    // Any other transition: use next_phase (forward) or indicate backward
    return { workflow: 'claim_task', isBackward: backward };
}

/**
 * Get the workspace root directory.
 */
function getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}


/**
 * Show a notification when a task is moved to a new phase.
 */
export async function showPhaseNotification(
    taskId: string,
    toColumnId: string,
    fromColumnId?: string,
): Promise<void> {
    const phaseName = PHASE_INFO[toColumnId]?.name || 'Unknown';

    // Don't show notification for moving to Done or Backlog
    if (toColumnId === 'col-done' || toColumnId === 'col-backlog') {
        return;
    }

    const result = getWorkflowForPhase(fromColumnId, toColumnId);
    if (!result) {
        return;
    }

    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        return;
    }

    const { isBackward } = result;

    // Auto-copy the claim command to clipboard for immediate paste into chat
    const claimCommand = `/claim ${taskId}`;
    await vscode.env.clipboard.writeText(claimCommand);

    // Build notification message with clipboard confirmation
    const direction = isBackward ? '← Back to' : '▶';
    const message = `${direction} ${taskId} → ${phaseName} — 📋 Copied "${claimCommand}" to clipboard`;

    // Show notification with action buttons
    const selection = await vscode.window.showInformationMessage(
        message,
        'Start Agent',
        'View Task'
    );

    if (selection === 'View Task') {
        await vscode.commands.executeCommand('board.openTask', taskId);
    } else if (selection === 'Start Agent') {
        await vscode.commands.executeCommand('devops.startAgentSession', undefined, {
            taskId,
            phase: phaseName
        });
    }
}
