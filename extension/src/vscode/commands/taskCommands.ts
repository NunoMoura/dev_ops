import * as vscode from 'vscode';
import * as path from 'path';
import type { BoardTreeProvider, BoardNode } from '../../ui/board';
import type { DevOpsCommandServices } from './types';
import { registerDevOpsCommand, getTaskFromNode } from './utils';
import { handleCardDeleteMessage } from './sharedHandlers';
import { readBoard, writeBoard, getWorkspaceRoot, runBoardOps } from '../../data';
import type { Task, Column } from '../../core';
import { COLUMN_FALLBACK_NAME, DEFAULT_COLUMN_NAME, formatError } from '../../core';
import { compareTasks, isDefined, createTaskId } from '../../domains/tasks/taskUtils';
import {
    ensurePlanDirectory,
    listPlanFiles,
    parsePlanFile,
    findOrCreateColumn,
    upsertPlanTask,
    ensureTaskDocument,
} from '../../domains/planning';
import {
    buildTaskDescription,
    buildTaskDetail,
    presentCodexPrompt,
    promptForTask,
    promptForColumn,
    appendTaskHistory,
    maybeOpenEntryPoints,
    openTaskContext,
} from '../../domains/tasks';

/**
 * Register all task-related commands
 */
export function registerTaskCommands(
    context: vscode.ExtensionContext,
    services: DevOpsCommandServices,
    syncFilterUI: () => void,
): void {
    const { provider, boardView } = services;

    // Task CRUD operations
    registerDevOpsCommand(
        context,
        'devops.createTask',
        async (node?: BoardNode) => {
            await handleCreateTask(provider, node);
        },
        'Unable to create task',
    );

    registerDevOpsCommand(
        context,
        'devops.deleteTask',
        async (node?: BoardNode) => {
            await handleDeleteTask(provider, syncFilterUI, node);
        },
        'Unable to delete task',
    );

    registerDevOpsCommand(
        context,
        'devops.moveTask',
        async (node?: BoardNode) => {
            await handleMoveTask(provider, boardView, node);
        },
        'Unable to move task',
    );

    // Task filtering
    registerDevOpsCommand(
        context,
        'devops.filterTasks',
        async () => {
            await handleFilterTasks(provider);
            syncFilterUI();
        },
        'Unable to apply filter',
    );

    registerDevOpsCommand(
        context,
        'devops.clearTaskFilter',
        async () => {
            await provider.clearFilters();
            syncFilterUI();
        },
        'Unable to clear filter',
    );

    registerDevOpsCommand(
        context,
        'devops.toggleAgentReadyFilter',
        async () => {
            await provider.toggleStatusFilter('blocked');
            syncFilterUI();
        },
        'Unable to toggle filter',
    );

    registerDevOpsCommand(
        context,
        'devops.toggleBlockedFilter',
        async () => {
            await provider.toggleBlockedFilter();
            syncFilterUI();
        },
        'Unable to toggle blocked filter',
    );

    // Task viewing
    registerDevOpsCommand(
        context,
        'devops.pickNextTask',
        async () => {
            await handlePickNextTask(provider, boardView);
        },
        'Unable to pick next task',
    );

    registerDevOpsCommand(
        context,
        'devops.showTaskDetails',
        async (taskId?: string) => {
            await handleFocusTaskDetails(taskId);
        },
        'Unable to open card details',
    );

    registerDevOpsCommand(
        context,
        'devops.viewTaskHistory',
        async (node?: BoardNode) => {
            await handleViewTaskHistory(node);
        },
        'Unable to view task history',
    );

    // Task utilities
    registerDevOpsCommand(
        context,
        'devops.openEntryPoints',
        async (node?: BoardNode) => {
            await handleOpenEntryPoints(node);
        },
        'Unable to open entry points',
    );

    registerDevOpsCommand(
        context,
        'devops.openTaskContext',
        async (node?: BoardNode) => {
            await handleOpenTaskContext(node);
        },
        'Unable to open task context',
    );

    registerDevOpsCommand(
        context,
        'devops.generateCodexPrompt',
        async (node?: BoardNode) => {
            await handleGenerateCodexPrompt(provider, node);
        },
        'Unable to build Codex prompt',
    );

    // Status management
    registerDevOpsCommand(
        context,
        'devops.setStatus',
        async (node?: BoardNode) => {
            const statuses = ['ready', 'agent_active', 'needs_feedback', 'blocked', 'done'];
            const picked = await vscode.window.showQuickPick(statuses, { placeHolder: 'Select new status' });
            if (picked) {
                await handleSetStatusViaPython(picked, `Set to ${picked}`, provider, node);
            }
        },
        'Unable to set status',
    );

    registerDevOpsCommand(
        context,
        'devops.markTaskInProgress',
        async (node?: BoardNode) => {
            await handleSetStatusViaPython('agent_active', 'Marked Agent Active', provider, node);
        },
        'Unable to update status',
    );

    registerDevOpsCommand(
        context,
        'devops.markTaskBlocked',
        async (node?: BoardNode) => {
            await handleSetStatusViaPython('blocked', 'Marked Blocked', provider, node);
        },
        'Unable to update status',
    );

    registerDevOpsCommand(
        context,
        'devops.markTaskDone',
        async (node?: BoardNode) => {
            await handleMarkDoneViaPython(provider, node);
        },
        'Unable to update status',
    );

    // Claim Task (Lexicon Unification)
    registerDevOpsCommand(
        context,
        'devops.claimTask',
        async (node?: BoardNode) => {
            // If node provided, claim that task. If not, auto-claim next (optional ID).
            await handleClaimTaskViaPython(provider, node);
        },
        'Unable to claim task',
    );
}

/**
 * Create a new task (programmatic)
 */
export async function createTask(
    board: any,
    columnId: string,
    title: string,
    summary?: string,
    priority?: 'low' | 'medium' | 'high'
): Promise<Task> {
    const taskId = createTaskId(board);

    const task: Task = {
        id: taskId,
        columnId: columnId,
        title: title,
        summary: summary,
        priority: priority,
        status: 'ready',
        updatedAt: new Date().toISOString(),
    };
    board.items.push(task);
    await writeBoard(board);
    await appendTaskHistory(task, `Created in column ${columnId}`);

    return task;
}

/**
 * Handle create task command (UI)
 */
async function handleCreateTask(
    provider: BoardTreeProvider,
    node?: BoardNode,
): Promise<void> {
    try {
        const board = await readBoard();

        // Determine target column - if not from context, prompt user
        let column: Column | undefined;
        if (node && node.kind === 'column') {
            column = node.column;
        } else {
            column = await promptForColumn(board, 'Create task in column');
            if (!column) {
                return;
            }
        }

        const task = await createTask(board, column.id, 'New Task');
        await provider.refresh();

        // Open task in editor tab for immediate editing
        // Note: "task created" notification will show when user saves via Save & Close button
        const uri = vscode.Uri.parse(`devops-task:/task/${task.id}.devops-task`);
        await vscode.commands.executeCommand('vscode.openWith', uri, 'devops.taskEditor');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create task: ${formatError(error)}`);
    }
}

/**
 * Delete a task via sidebar action - prompts for task selection if not provided
 */
async function handleDeleteTask(
    provider: BoardTreeProvider,
    syncFilterUI: () => void,
    node?: BoardNode,
): Promise<void> {
    const board = await readBoard();
    const task = node && node.kind === 'item' ? node.item : await promptForTask(board);
    if (!task) {
        return;
    }
    await handleCardDeleteMessage(task.id, provider, syncFilterUI);
}

/**
 * Move a task to a different column
 */
async function handleMoveTask(
    provider: BoardTreeProvider,
    view: vscode.TreeView<BoardNode>,
    node?: BoardNode,
): Promise<void> {
    const board = await readBoard();
    const task = node && node.kind === 'item' ? node.item : await promptForTask(board);
    if (!task) {
        return;
    }
    const currentColumn = board.columns.find((c) => c.id === task.columnId);
    const targetColumn = await promptForColumn(board, 'Move task to column', currentColumn?.id);
    if (!targetColumn || targetColumn.id === task.columnId) {
        return;
    }
    task.columnId = targetColumn.id;
    task.updatedAt = new Date().toISOString();
    await writeBoard(board);
    await provider.refresh();
    await appendTaskHistory(task, `Moved to column ${targetColumn.name || COLUMN_FALLBACK_NAME}`);
    await provider.revealTask(task.id, view);
}

/**
 * Filter tasks
 */
async function handleFilterTasks(provider: BoardTreeProvider): Promise<void> {
    const raw = await vscode.window.showInputBox({
        prompt: 'Filter tasks (use #tag for tag matches)',
        placeHolder: '#agentReady backend in_progress',
        value: provider.getFilterText() ?? '',
    });
    if (raw === undefined) {
        return;
    }
    await provider.setTextFilter(raw);
}

/**
 * Pick the next highest priority task
 */
async function handlePickNextTask(provider: BoardTreeProvider, view: vscode.TreeView<BoardNode>) {
    const board = await readBoard();
    if (!board.items.length) {
        vscode.window.showInformationMessage('No tasks found in .dev_ops/board.json.');
        return;
    }
    const ranked = [...board.items].sort(compareTasks);
    const quickPickItems = ranked.map((item) => ({
        label: item.title,
        detail: [item.summary, item.status ? `(${item.status})` : undefined].filter(isDefined).join(' — '),
        description: buildTaskDescription(item),
        item,
    }));
    const selection = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: 'Select the next task to focus on',
    });
    if (!selection) {
        return;
    }
    await provider.revealTask(selection.item.id, view);
    await maybeOpenEntryPoints(selection.item);
}

/**
 * Focus task details (open in editor)
 */
async function handleFocusTaskDetails(taskId: string | undefined): Promise<void> {
    const board = await readBoard();
    let task = taskId ? board.items.find((item) => item.id === taskId) : undefined;
    if (!task) {
        task = await promptForTask(board);
        if (!task) {
            return;
        }
    }
    // Open task in editor tab
    const uri = vscode.Uri.parse(`devops-task:/task/${task.id}.devops-task`);
    await vscode.commands.executeCommand('vscode.openWith', uri, 'devops.taskEditor');
}

/**
 * View task history document
 */
async function handleViewTaskHistory(node?: BoardNode): Promise<void> {
    const board = await readBoard();
    let task = getTaskFromNode(node);
    if (!task) {
        task = await promptForTask(board);
    }
    if (!task) {
        return;
    }
    const root = getWorkspaceRoot();
    if (!root) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }
    const historyPath = path.join(root, 'dev_ops', 'board', 'tasks', `${task.id}.md`);
    try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(historyPath));
        await vscode.window.showTextDocument(doc, { preview: true });
    } catch (error: any) {
        if (error?.code === 'FileNotFound' || error?.message?.includes('cannot find')) {
            vscode.window.showInformationMessage(`No history found for ${task.id}.`);
        } else {
            throw error;
        }
    }
}

/**
 * Open task entry points
 */
async function handleOpenEntryPoints(node?: BoardNode): Promise<void> {
    const board = await readBoard();
    let task = getTaskFromNode(node);
    if (!task) {
        task = await promptForTask(board);
    }
    if (!task) {
        return;
    }
    await maybeOpenEntryPoints(task);
}

/**
 * Open task context file
 */
async function handleOpenTaskContext(node?: BoardNode): Promise<void> {
    const board = await readBoard();
    let task = getTaskFromNode(node);
    if (!task) {
        task = await promptForTask(board);
    }
    if (!task) {
        return;
    }
    await openTaskContext(task);
}

/**
 * Generate Codex prompt for a task
 */
async function handleGenerateCodexPrompt(provider: BoardTreeProvider, node?: BoardNode): Promise<void> {
    const board = await readBoard();
    const task = node && node.kind === 'item' ? node.item : await promptForTask(board);
    if (!task) {
        return;
    }
    const columnName = board.columns.find((column) => column.id === task.columnId)?.name ?? COLUMN_FALLBACK_NAME;
    await presentCodexPrompt(task, columnName);
}

/**
 * Set task status using Python CLI (board_ops.py status)
 * This is the correct approach - status is a field, not a column.
 */
async function handleSetStatusViaPython(
    status: string,
    successMessage: string,
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

    const result = await runBoardOps(['status', task.id, status], cwd);
    if (result.code !== 0) {
        throw new Error(result.stderr || `Failed to set status: exit code ${result.code}`);
    }

    await provider.refresh();
    vscode.window.showInformationMessage(`${task.title} — ${successMessage}`);
}

/**
 * Mark a task as done using Python CLI
 * Wraps: board_ops.py done TASK_ID
 */
async function handleMarkDoneViaPython(
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

    const result = await runBoardOps(['done', task.id], cwd);
    if (result.code !== 0) {
        throw new Error(result.stderr || `Failed to mark done: exit code ${result.code}`);
    }

    await provider.refresh();
    vscode.window.showInformationMessage(`✅ ${task.id} marked done and archived`);
}

/**
 * Claim a task (Specific or Next)
 * Wraps: board_ops.py claim [TASK_ID]
 */
async function handleClaimTaskViaPython(
    provider: BoardTreeProvider,
    node?: BoardNode,
): Promise<void> {
    const cwd = getWorkspaceRoot();
    if (!cwd) {
        throw new Error('No workspace folder open');
    }

    let taskId: string | undefined;

    // If invoked from context menu or tree item
    if (node && node.kind === 'item') {
        taskId = node.item.id;
    }
    // If invoked from command palette with no context, verify if user wants specific task or next
    else {
        const board = await readBoard();
        const task = await promptForTask(board);
        if (task) {
            taskId = task.id;
        } else {
            // User cancelled selection, maybe they want "next"?
            // Let's explicitly ask or default to next.
            // For now, let's assume if they don't pick one, we try to claim next IF they selected "Claim Next" command, 
            // but this is a generic claim command.

            // Allow "Claim Next" behavior if no task selected?
            // Let's support a separate invocation or just pass no ID to python to let it decide.
            // But promptForTask returns undefined on escape.
        }
    }

    const args = ['claim'];
    if (taskId) {
        args.push(taskId);
    }

    // Auto-commit board state
    args.push('--commit');

    const result = await runBoardOps(args, cwd);
    if (result.code !== 0) {
        throw new Error(result.stderr || `Failed to claim task: exit code ${result.code}`);
    }

    await provider.refresh();
    // Parse output for task ID if it was auto-picked
    const match = result.stdout.match(/Claimed (TASK-\d+)/);
    const claimedId = match ? match[1] : (taskId || 'task');

    vscode.window.showInformationMessage(`✅ Claimed ${claimedId}`);
}
