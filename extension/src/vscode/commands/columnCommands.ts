import * as vscode from 'vscode';
import type { BoardTreeProvider, BoardNode, BoardManagerNode } from '../../ui/board';
import type { DevOpsCommandServices } from './types';
import { registerDevOpsCommand, getColumnFromAnyNode } from './utils';
import { readBoard, writeBoard } from '../../services/board/boardPersistence';
import type { Column } from '../../types';
import { COLUMN_FALLBACK_NAME } from '../../types';
import { createId, getNextColumnPosition, sortColumnsForManager } from '../../services/tasks/taskUtils';
import { promptForColumn } from '../../services/tasks';

/**
 * Register all column-related commands
 */
export function registerColumnCommands(
    context: vscode.ExtensionContext,
    services: DevOpsCommandServices,
): void {
    const { provider } = services;

    registerDevOpsCommand(
        context,
        'devops.createColumn',
        async () => {
            await handleCreateColumn(provider);
        },
        'Unable to create column',
    );

    registerDevOpsCommand(
        context,
        'devops.renameColumn',
        async (node?: BoardNode | BoardManagerNode) => {
            await handleRenameColumn(provider, node);
        },
        'Unable to rename column',
    );

    registerDevOpsCommand(
        context,
        'devops.deleteColumn',
        async (node?: BoardNode | BoardManagerNode) => {
            await handleDeleteColumn(provider, node);
        },
        'Unable to delete column',
    );

    registerDevOpsCommand(
        context,
        'devops.configureColumn',
        async (node?: BoardNode | BoardManagerNode) => {
            await handleConfigureColumn(provider, node);
        },
        'Unable to configure column',
    );
}

/**
 * Configure a column (e.g. WIP Limits)
 */
async function handleConfigureColumn(provider: BoardTreeProvider, node?: BoardNode | BoardManagerNode): Promise<void> {
    const board = await readBoard();
    let column = getColumnFromAnyNode(board, node);
    if (!column) {
        column = await promptForColumn(board, 'Select a column to configure');
    }
    if (!column) {
        return;
    }

    const currentWip = column.wipLimit?.toString() || '';
    const newWipStr = await vscode.window.showInputBox({
        prompt: `Set Max Work-in-Progress Limit for "${column.name}"`,
        placeHolder: 'e.g. 3 (Leave empty for no limit)',
        value: currentWip,
        validateInput: (value) => {
            if (!value) { return undefined; }
            const n = parseInt(value, 10);
            if (isNaN(n) || n < 0) { return 'Please enter a positive number'; }
            return undefined;
        }
    });

    if (newWipStr === undefined) {
        return; // Canceled
    }

    if (newWipStr === '') {
        delete column.wipLimit;
    } else {
        column.wipLimit = parseInt(newWipStr, 10);
    }

    await writeBoard(board);
    await provider.refresh();
    vscode.window.showInformationMessage(`Configured "${column.name}": WIP Limit = ${column.wipLimit ?? 'Unlimited'}`);
}

/**
 * Create a new column
 */
async function handleCreateColumn(provider: BoardTreeProvider): Promise<void> {
    const board = await readBoard();
    const name = await vscode.window.showInputBox({
        prompt: 'Column name',
        placeHolder: 'Todo, Doing, Done',
        validateInput: (value) => (!value?.trim() ? 'Column name is required' : undefined),
    });
    if (!name) {
        return;
    }
    const column: Column = {
        id: createId('col', name),
        name: name.trim(),
        position: getNextColumnPosition(board.columns),
    };
    board.columns.push(column);
    await writeBoard(board);
    await provider.refresh();
    vscode.window.showInformationMessage(`Created column "${column.name}".`);
}

/**
 * Rename an existing column
 */
async function handleRenameColumn(provider: BoardTreeProvider, node?: BoardNode | BoardManagerNode): Promise<void> {
    const board = await readBoard();
    let column = getColumnFromAnyNode(board, node);
    if (!column) {
        column = await promptForColumn(board, 'Select a column to rename');
    }
    if (!column) {
        return;
    }
    const nextName = await vscode.window.showInputBox({
        prompt: 'New column name',
        value: column.name,
        validateInput: (value) => (!value?.trim() ? 'Column name is required' : undefined),
    });
    if (!nextName) {
        return;
    }
    column.name = nextName.trim();
    await writeBoard(board);
    await provider.refresh();
    vscode.window.showInformationMessage(`Renamed column to "${column.name}".`);
}

/**
 * Delete a column (with optional task relocation)
 */
async function handleDeleteColumn(provider: BoardTreeProvider, node?: BoardNode | BoardManagerNode): Promise<void> {
    const board = await readBoard();
    let column = getColumnFromAnyNode(board, node);
    if (!column) {
        column = await promptForColumn(board, 'Select a column to delete');
    }
    if (!column) {
        return;
    }
    const tasksInColumn = board.items.filter((item) => item.columnId === column.id);
    const remainingColumns = board.columns.filter((candidate) => candidate.id !== column.id);
    let targetColumn: Column | undefined;
    if (tasksInColumn.length) {
        if (!remainingColumns.length) {
            vscode.window.showWarningMessage('Cannot delete the only column that still contains cards.');
            return;
        }
        type ColumnQuickPick = vscode.QuickPickItem & { column: Column };
        const picks: ColumnQuickPick[] = sortColumnsForManager(remainingColumns).map((candidate) => ({
            label: candidate.name || COLUMN_FALLBACK_NAME,
            description: `Position ${candidate.position ?? 0}`,
            column: candidate,
        }));
        const suffix = tasksInColumn.length === 1 ? 'card' : 'cards';
        const selection = await vscode.window.showQuickPick(picks, {
            placeHolder: `Move ${tasksInColumn.length} ${suffix} to...`,
        });
        if (!selection) {
            return;
        }
        targetColumn = selection.column;
    }
    const confirmation = await vscode.window.showWarningMessage(
        `Delete column "${column.name || COLUMN_FALLBACK_NAME}"?`,
        { modal: true },
        'Delete',
    );
    if (confirmation !== 'Delete') {
        return;
    }
    if (targetColumn) {
        for (const task of tasksInColumn) {
            task.columnId = targetColumn.id;
            task.updatedAt = new Date().toISOString();
        }
    }
    const normalized = sortColumnsForManager(remainingColumns);
    normalized.forEach((candidate, index) => {
        candidate.position = index + 1;
    });
    board.columns = normalized;
    await writeBoard(board);
    await provider.refresh();
    const relocated = targetColumn ? ` Cards moved to ${targetColumn.name || COLUMN_FALLBACK_NAME}.` : '';
    vscode.window.showInformationMessage(`Deleted column "${column.name || COLUMN_FALLBACK_NAME}".${relocated}`);
}
