import * as vscode from 'vscode';
import type { BoardTreeProvider } from '../../ui/board';

import type { MoveTasksRequest } from './types';
import { readBoard, writeBoard, getWorkspaceRoot } from '../../services/board/boardPersistence';
import { boardService } from '../../services/board/boardService';
import { COLUMN_FALLBACK_NAME, Task, TaskDetailsPayload } from '../../types';
import { formatError } from '../../infrastructure/errors';
import { moveTasksToColumn } from '../../services/tasks';
import { parseTags } from '../../services/tasks/taskUtils';


/**
 * Shared handler functions exported for use by extension.ts, board webview, and task editor.
 * These handlers are called from multiple modules and must remain exported from the main index.
 */

/**
 * Handle moving tasks to a different column (from board webview drag-and-drop)
 * 
 * Used by: BoardPanelManager in extension.ts
 */
export async function handleBoardMoveTasks(request: MoveTasksRequest, provider: BoardTreeProvider): Promise<void> {
    if (!request.taskIds?.length || !request.columnId) {
        return;
    }
    try {
        const result = await moveTasksToColumn(request.taskIds, request.columnId);
        if (!result.movedTaskIds.length) {
            return;
        }
        await provider.refresh();
        const count = result.movedTaskIds.length;
        const suffix = count === 1 ? '' : 's';
        vscode.window.showInformationMessage(`Moved ${count} task${suffix} to ${result.columnName}.`);

        // Auto-trigger agent session if moving to an active phase (not Backlog or Done)
        const columnName = result.columnName || request.columnId;
        const isBacklog = request.columnId === 'col-backlog' || columnName.toLowerCase() === 'backlog';
        const isDone = request.columnId === 'col-done' || columnName.toLowerCase() === 'done';

        if (!isBacklog && !isDone && request.taskIds.length > 0) {
            // Trigger startAgentSession for the primary task
            // We pass phase name as context
            try {
                // We use executeCommand but handle errors gracefully so the user isn't blocked 
                // if the agent fails to launch (e.g. extension not installed)
                await vscode.commands.executeCommand('devops.startAgentSession', undefined, {
                    taskId: request.taskIds[0],
                    phase: columnName
                });

                if (count === 1) {
                    vscode.window.showInformationMessage(`Agent Session ready for ${columnName}.`);
                }
            } catch (err) {
                // Log but do NOT show modal error to user, as the move action succeeded
                console.warn('Failed to auto-start agent session:', err);
                // Optional: Show status bar message instead of modal?
                vscode.window.setStatusBarMessage(`Agent session skipped: ${err instanceof Error ? err.message : String(err)}`, 5000);
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Unable to move tasks: ${formatError(error)}`);
    }
}

/**
 * Handle opening a task in the task editor (from board webview click)
 * 
 * Used by: BoardPanelManager in extension.ts
 */
export async function handleBoardOpenTask(taskId: string): Promise<void> {
    if (!taskId) {
        return;
    }
    try {
        const board = await readBoard();
        const task = board.items.find((item) => item.id === taskId);
        if (!task) {
            vscode.window.showWarningMessage('Task not found on the current Board board.');
            return;
        }

        // Open task in a new editor tab
        const uri = vscode.Uri.parse(`devops-task:/task/${taskId}.devops-task`);
        await vscode.commands.executeCommand('vscode.openWith', uri, 'devops.taskEditor');
    } catch (error) {
        vscode.window.showErrorMessage(`Unable to open task: ${formatError(error)}`);
    }
}

/**
 * Handle updating a task from the task editor
 * 
 * Used by: TaskEditorProvider
 */
/**
 * Handle updating a task from the task editor
 * 
 * Used by: TaskEditorProvider
 */
export async function handleCardUpdateMessage(
    update: TaskDetailsPayload,
    provider: BoardTreeProvider,
    syncFilterUI: () => void,
): Promise<void> {
    try {
        if (!update.id) {
            throw new Error('Missing task id');
        }

        // Use boardService for correct persistence
        const updates: Partial<Omit<Task, 'id'>> = {};

        if (update.title !== undefined) { updates.title = update.title.trim() || 'Untitled'; }
        if (update.summary !== undefined) { updates.summary = update.summary.trim() || undefined; }
        if (update.tags !== undefined) { updates.tags = parseTags(update.tags); }
        if (update.checklist !== undefined) { updates.checklist = update.checklist; }
        // priority update removed
        if (update.workflow !== undefined) { updates.workflow = update.workflow; }

        if (update.status !== undefined) { updates.status = update.status as any; }


        // Persist dependency changes
        if ('dependsOn' in update) {
            updates.dependsOn = update.dependsOn?.length ? update.dependsOn : undefined;
        }

        await boardService.updateTask(update.id, updates);

        // Refresh UI
        await provider.refresh();
        syncFilterUI();
    } catch (error) {
        vscode.window.showErrorMessage(`Unable to save task: ${formatError(error)}`);
    }
}

/**
 * Handle deleting a task from the task editor
 * 
 * Used by: TaskEditorProvider
 */
export async function handleCardDeleteMessage(
    taskId: string,
    provider: BoardTreeProvider,
    syncFilterUI: () => void,
): Promise<void> {
    try {
        if (!taskId) {
            throw new Error('Missing task id');
        }

        // Get task details for confirmation message (optional, but good UX)
        // boardService.getTask would be better but readBoard works for confirmation reading
        const board = await readBoard();
        const task = board.items.find(t => t.id === taskId);

        if (!task) {
            throw new Error('Task not found');
        }

        const confirmDelete = 'Delete Task';
        const columnName = board.columns.find((column) => column.id === task.columnId)?.name ?? COLUMN_FALLBACK_NAME;
        const selection = await vscode.window.showWarningMessage(
            `Delete "${task.title}" from ${columnName}?`,
            { modal: true, detail: 'This cannot be undone.' },
            confirmDelete,
            'Cancel',
        );
        if (selection !== confirmDelete) {
            return;
        }

        await boardService.deleteTask(taskId);

        await provider.refresh();
        syncFilterUI();
        vscode.window.showInformationMessage('Task deleted.');
    } catch (error) {
        vscode.window.showErrorMessage(`Unable to delete task: ${formatError(error)}`);
    }
}

/**
 * Archive all tasks in the Done column
 * 
 * Used by: BoardPanelManager in extension.ts
 */
export async function handleArchiveAll(provider: BoardTreeProvider): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
        'Archive all tasks in Done column?',
        { modal: true },
        'Archive',
    );
    if (confirmed !== 'Archive') {
        return;
    }

    try {
        const result = await boardService.archiveAllDone();
        await provider.refresh();
        vscode.window.showInformationMessage(
            result.count > 0
                ? `Archived ${result.count} task${result.count > 1 ? 's' : ''}.`
                : 'No done tasks to archive.'
        );
    } catch (error) {
        vscode.window.showErrorMessage(`Unable to archive tasks: ${formatError(error)}`);
    }
}

/**
 * Archive a single task by ID
 * 
 * Used by: BoardPanelManager in extension.ts
 */
export async function handleArchiveSingle(taskId: string, provider: BoardTreeProvider): Promise<void> {
    try {
        await boardService.archiveTask(taskId);
        await provider.refresh();
        vscode.window.showInformationMessage(`Archived task ${taskId}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Unable to archive task: ${formatError(error)}`);
    }
}

/**
 * Handle deleting multiple tasks (from board webview)
 * 
 * Used by: BoardPanelManager in extension.ts
 */
export async function handleBoardDeleteTasks(taskIds: string[], provider: BoardTreeProvider): Promise<void> {
    if (!taskIds?.length) {
        return;
    }
    const count = taskIds.length;
    const confirmed = await vscode.window.showWarningMessage(
        `Delete ${count} task${count > 1 ? 's' : ''}?`,
        { modal: true },
        'Delete'
    );
    if (confirmed !== 'Delete') {
        return;
    }

    // Close any open editor tabs for these tasks to prevent stale state if IDs are reused
    try {
        const tabsToClose: vscode.Tab[] = [];
        const allGroups = vscode.window.tabGroups.all;

        for (const group of allGroups) {
            for (const tab of group.tabs) {
                // Check for Custom Text Editor tabs (Task Editor)
                if (tab.input instanceof vscode.TabInputCustom && tab.input.viewType === 'devops.taskEditor') {
                    const uriString = tab.input.uri.toString();
                    // URI format: devops-task:/task/TASK-001.devops-task
                    // See if any deleted Task ID is in the URI
                    if (taskIds.some(id => uriString.includes(`${id}.devops-task`))) {
                        tabsToClose.push(tab);
                    }
                }
            }
        }

        if (tabsToClose.length > 0) {
            await vscode.window.tabGroups.close(tabsToClose);
        }
    } catch (e) {
        console.warn('Failed to close tabs for deleted tasks', e);
    }

    try {
        for (const taskId of taskIds) {
            try {
                await boardService.deleteTask(taskId);
            } catch (e) {
                console.error(`Failed to delete ${taskId}`, e);
            }
        }
        await provider.refresh();
        vscode.window.showInformationMessage(`Deleted ${count} task${count > 1 ? 's' : ''}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Unable to delete tasks: ${formatError(error)}`);
    }
}
