import * as vscode from 'vscode';
import type { BoardTreeProvider } from '../../ui/board';
import type { TaskDetailsPayload } from '../../ui/tasks';
import type { MoveTasksRequest } from './types';
import { readBoard, writeBoard, getWorkspaceRoot, boardService } from '../../data';
import { formatError, COLUMN_FALLBACK_NAME } from '../../core';
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
            void vscode.commands.executeCommand('devops.startAgentSession', undefined, {
                taskId: request.taskIds[0],
                phase: columnName
            });

            if (count === 1) {
                vscode.window.showInformationMessage(`Agent Session ready for ${columnName}.`);
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
export async function handleCardUpdateMessage(
    update: TaskDetailsPayload,
    provider: BoardTreeProvider,
    syncFilterUI: () => void,
): Promise<void> {
    try {
        if (!update.id) {
            throw new Error('Missing task id');
        }
        const board = await readBoard();
        const task = board.items.find((item) => item.id === update.id);
        if (!task) {
            throw new Error('Task not found in board');
        }
        if (!update.title?.trim()) {
            throw new Error('Title is required');
        }
        task.title = update.title.trim();
        task.summary = update.summary?.trim() || undefined;
        task.tags = parseTags(update.tags);
        task.priority = update.priority || undefined;
        task.workflow = update.workflow || task.workflow;
        task.upstream = update.upstream || task.upstream;
        task.downstream = update.downstream || task.downstream;
        task.status = update.status as any || task.status;
        task.updatedAt = new Date().toISOString();
        await writeBoard(board);
        await provider.refresh();
        syncFilterUI();
        // Note: task details view replaced by editor tabs with their own rendering
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
        const board = await readBoard();
        const index = board.items.findIndex((item) => item.id === taskId);
        if (index === -1) {
            throw new Error('Task not found in board');
        }
        const task = board.items[index];
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
        board.items.splice(index, 1);
        await writeBoard(board);
        await provider.refresh();
        syncFilterUI();
        // Note: task editor tab will naturally close when task no longer exists
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
    try {
        const board = await readBoard();
        board.items = board.items.filter(t => !taskIds.includes(t.id));
        await writeBoard(board);
        await provider.refresh();
        vscode.window.showInformationMessage(`Deleted ${count} task${count > 1 ? 's' : ''}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Unable to delete tasks: ${formatError(error)}`);
    }
}
