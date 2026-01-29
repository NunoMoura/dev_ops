import * as vscode from 'vscode';
import type { Board, Column, Task } from '../../types';
import type { BoardNode, BoardManagerNode } from '../../ui/board';
import { formatError } from '../../infrastructure/errors';

/**
 * Register a DevOps command with automatic error handling
 * 
 * @param context - Extension context for registering disposables
 * @param commandId - VS Code command identifier (e.g., 'devops.createTask')
 * @param handler - Command handler function
 * @param errorMessage - Optional custom error message prefix
 */
export function registerDevOpsCommand(
    context: vscode.ExtensionContext,
    commandId: string,
    handler: (...args: any[]) => unknown,
    errorMessage?: string,
): void {
    const disposable = vscode.commands.registerCommand(commandId, async (...args: any[]) => {
        try {
            await handler(...args);
        } catch (error) {
            const prefix = errorMessage ?? `Unable to execute ${commandId}`;
            vscode.window.showErrorMessage(`${prefix}: ${formatError(error)}`);
        }
    });
    context.subscriptions.push(disposable);
}

/**
 * Extract task from a board node
 * 
 * @param node - Board tree view node
 * @returns Task if node represents a task item, undefined otherwise
 */
export function getTaskFromNode(node?: BoardNode): Task | undefined {
    if (!node) {
        return undefined;
    }
    if (node.kind === 'item') {
        return node.item;
    }
    return undefined;
}

/**
 * Extract column from any board node type
 * 
 * @param board - Board data
 * @param node - Board tree view node (regular or manager)
 * @returns Column if node has associated column, undefined otherwise
 */
export function getColumnFromAnyNode(board: Board, node?: BoardNode | BoardManagerNode): Column | undefined {
    const columnId = getColumnIdFromNode(node);
    if (!columnId) {
        return undefined;
    }
    return board.columns.find((candidate) => candidate.id === columnId);
}

/**
 * Extract column ID from any board node type
 * 
 * @param node - Board tree view node (regular or manager)
 * @returns Column ID if node has associated column, undefined otherwise
 */
export function getColumnIdFromNode(node?: BoardNode | BoardManagerNode): string | undefined {
    if (!node) {
        return undefined;
    }
    if (node.kind === 'action') {
        return undefined;
    }
    if (node.kind === 'item') {
        return node.item.columnId;
    }
    if (node.kind === 'column') {
        return node.column.id;
    }
    return undefined;
}
