import * as vscode from 'vscode';
import * as path from 'path';
import { runBoardOps, runDocOps } from './pythonRunner';
import { TaskDetailsPayload } from '../taskDetailsView';
import { MetricsViewProvider } from '../metricsView';
import { BoardTreeProvider, BoardNode, BoardManagerNode } from '../providers/boardTreeProvider';
import {
  Board,
  Column,
  Task,
  COLUMN_FALLBACK_NAME,
  DEFAULT_COLUMN_NAME,
} from '../features/types';
import { readBoard, writeBoard, ensureBoardUri, getWorkspaceRoot } from '../features/boardStore';
import {
  compareNumbers,
  compareTasks,
  createId,
  createTaskId,
  getNextColumnPosition,
  parseTags,
  sortColumnsForManager,
  isDefined,
} from '../features/kanbanData';
import {
  ensurePlanDirectory,
  listPlanFiles,
  parsePlanFile,
  findOrCreateColumn,
  upsertPlanTask,
  ensureTaskDocument,
} from '../features/planImport';
import {
  buildTaskDescription,
  buildTaskDetail,
  buildCardPayload,
  presentCodexPrompt,
} from '../features/taskPresentation';
import {
  promptForTask,
  promptForColumn,
  appendTaskHistory,
  maybeOpenEntryPoints,
  openTaskContext,
  moveTasksToColumn,
  MoveTasksResult,
} from '../features/taskAccess';
import { formatError } from '../features/errors';
import { MoveTasksRequest } from './types';

export type KanbanCommandServices = {
  provider: BoardTreeProvider;
  kanbanView: vscode.TreeView<BoardNode>;
  metricsProvider: MetricsViewProvider;
};

export function registerBoardCommands(
  context: vscode.ExtensionContext,
  services: KanbanCommandServices,
  syncFilterUI: () => void,
): void {
  const { provider, kanbanView } = services;

  // Note: kanban.openBoard is registered in boardView.ts (opens the webview panel)

  registerKanbanCommand(
    context,
    'kanban.pickNextTask',
    async () => {
      await handlePickNextTask(provider, kanbanView);
    },
    'Unable to pick next task',
  );

  // Note: kanban.showTaskDetails is registered below (opens card details panel)

  registerKanbanCommand(
    context,
    'kanban.getTasks',
    async () => {
      const board = await readBoard();
      const doc = await vscode.workspace.openTextDocument({
        language: 'json',
        content: JSON.stringify(board, null, 2),
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    },
    'Unable to load Kanban tasks',
  );

  registerKanbanCommand(
    context,
    'kanban.createColumn',
    async () => {
      await handleCreateColumn(provider);
    },
    'Unable to create column',
  );

  registerKanbanCommand(
    context,
    'kanban.renameColumn',
    async (node?: BoardNode | BoardManagerNode) => {
      await handleRenameColumn(provider, node);
    },
    'Unable to rename column',
  );

  registerKanbanCommand(
    context,
    'kanban.deleteColumn',
    async (node?: BoardNode | BoardManagerNode) => {
      await handleDeleteColumn(provider, node);
    },
    'Unable to delete column',
  );

  registerKanbanCommand(
    context,
    'kanban.createTask',
    async (node?: BoardNode) => {
      await handleCreateTask(provider, node);
    },
    'Unable to create task',
  );

  registerKanbanCommand(
    context,
    'kanban.moveTask',
    async (node?: BoardNode) => {
      await handleMoveTask(provider, kanbanView, node);
    },
    'Unable to move task',
  );

  registerKanbanCommand(
    context,
    'kanban.filterTasks',
    async () => {
      await handleFilterTasks(provider);
      syncFilterUI();
    },
    'Unable to apply filter',
  );

  registerKanbanCommand(
    context,
    'kanban.clearTaskFilter',
    async () => {
      await provider.clearFilters();
      syncFilterUI();
    },
    'Unable to clear filter',
  );

  // toggleAgentReadyFilter command removed - using status filter instead
  registerKanbanCommand(
    context,
    'kanban.toggleAgentReadyFilter',
    async () => {
      await provider.toggleStatusFilter('blocked');
      syncFilterUI();
    },
    'Unable to toggle filter',
  );

  registerKanbanCommand(
    context,
    'kanban.toggleBlockedFilter',
    async () => {
      await provider.toggleBlockedFilter();
      syncFilterUI();
    },
    'Unable to toggle blocked filter',
  );

  registerKanbanCommand(
    context,
    'kanban.importPlan',
    async () => {
      await handleImportPlan(provider, kanbanView);
    },
    'Unable to import plan',
  );

  registerKanbanCommand(
    context,
    'kanban.generateCodexPrompt',
    async (node?: BoardNode) => {
      await handleGenerateCodexPrompt(provider, node);
    },
    'Unable to build Codex prompt',
  );

  registerKanbanCommand(
    context,
    'kanban.openEntryPoints',
    async (node?: BoardNode) => {
      await handleOpenEntryPoints(node);
    },
    'Unable to open entry points',
  );

  registerKanbanCommand(
    context,
    'kanban.openTaskContext',
    async (node?: BoardNode) => {
      await handleOpenTaskContext(node);
    },
    'Unable to open task context',
  );

  registerKanbanCommand(
    context,
    'kanban.showTaskDetails',
    async (taskId?: string) => {
      await handleFocusTaskDetails(taskId);
    },
    'Unable to open card details',
  );

  registerKanbanCommand(
    context,
    'kanban.markTaskInProgress',
    async (node?: BoardNode) => {
      await handleSetStatusViaPython('agent_active', 'Marked Agent Active', provider, node);
    },
    'Unable to update status',
  );

  registerKanbanCommand(
    context,
    'kanban.markTaskBlocked',
    async (node?: BoardNode) => {
      await handleSetStatusViaPython('blocked', 'Marked Blocked', provider, node);
    },
    'Unable to update status',
  );

  registerKanbanCommand(
    context,
    'kanban.setStatus',
    async (node?: BoardNode) => {
      const statuses = ['ready', 'agent_active', 'needs_feedback', 'blocked', 'done'];
      const picked = await vscode.window.showQuickPick(statuses, { placeHolder: 'Select new status' });
      if (picked) {
        await handleSetStatusViaPython(picked, `Set to ${picked}`, provider, node);
      }
    },
    'Unable to set status',
  );

  registerKanbanCommand(
    context,
    'kanban.claimTask',
    async (node?: BoardNode) => {
      await handleClaimTaskViaPython(provider, node);
    },
    'Unable to claim task',
  );

  registerKanbanCommand(
    context,
    'devops.spawnAgent',
    async () => {
      await handleSpawnAgent(provider);
    },
    'Unable to spawn agent',
  );

  registerKanbanCommand(
    context,
    'devops.nextPhase',
    async (node?: BoardNode) => {
      await handleNextPhase(provider, node);
    },
    'Unable to move to next phase',
  );

  registerKanbanCommand(
    context,
    'devops.retryPhase',
    async () => {
      await handleOpenWorkflow('retry_phase');
    },
    'Unable to open retry workflow',
  );

  registerKanbanCommand(
    context,
    'devops.refinePhase',
    async () => {
      await handleRefinePhase(provider);
    },
    'Unable to refine phase',
  );

  registerKanbanCommand(
    context,
    'kanban.markTaskDone',
    async (node?: BoardNode) => {
      await handleMarkDoneViaPython(provider, node);
    },
    'Unable to update status',
  );

  registerKanbanCommand(
    context,
    'kanban.deleteTask',
    async (node?: BoardNode) => {
      await handleDeleteTask(provider, syncFilterUI, node);
    },
    'Unable to delete task',
  );

  registerKanbanCommand(
    context,
    'kanban.viewTaskHistory',
    async (node?: BoardNode) => {
      await handleViewTaskHistory(node);
    },
    'Unable to view task history',
  );

  registerKanbanCommand(
    context,
    'kanban.openSettings',
    async () => {
      // Open extension settings filtered to DevOps
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:NunoMoura.dev-ops');
    },
    'Unable to open settings',
  );

  registerKanbanCommand(
    context,
    'devops.createUser',
    async () => {
      await handleCreateUser();
    },
    'Unable to create user persona',
  );

  registerKanbanCommand(
    context,
    'devops.createStory',
    async () => {
      await handleCreateStory();
    },
    'Unable to create user story',
  );

  // Doc creation commands for Docs view buttons
  registerKanbanCommand(
    context,
    'devops.newArchDoc',
    async () => {
      await handleNewArchDoc();
    },
    'Unable to create architecture doc',
  );

  registerKanbanCommand(
    context,
    'devops.newUserPersona',
    async () => {
      await handleCreateUser();
    },
    'Unable to create user persona',
  );

  registerKanbanCommand(
    context,
    'devops.newUserStory',
    async () => {
      await handleCreateStory();
    },
    'Unable to create user story',
  );

  registerKanbanCommand(
    context,
    'devops.newMockup',
    async () => {
      await handleNewMockup();
    },
    'Unable to create mockup',
  );
}

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
  } catch (error) {
    vscode.window.showErrorMessage(`Unable to move tasks: ${formatError(error)}`);
  }
}

export async function handleBoardOpenTask(taskId: string): Promise<void> {
  if (!taskId) {
    return;
  }
  try {
    const board = await readBoard();
    const task = board.items.find((item) => item.id === taskId);
    if (!task) {
      vscode.window.showWarningMessage('Task not found on the current Kanban board.');
      return;
    }

    // Open task in a new editor tab
    const uri = vscode.Uri.parse(`kanban-task:/task/${taskId}.kanban-task`);
    await vscode.commands.executeCommand('vscode.openWith', uri, 'kanban.taskEditor');
  } catch (error) {
    vscode.window.showErrorMessage(`Unable to open task: ${formatError(error)}`);
  }
}

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
 * Delete a task via sidebar action - prompts for task selection if not provided.
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

function registerKanbanCommand(
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

async function handlePickNextTask(provider: BoardTreeProvider, view: vscode.TreeView<BoardNode>) {
  const board = await readBoard();
  if (!board.items.length) {
    vscode.window.showInformationMessage('No tasks found in dev_ops/board.json.');
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

async function handleShowTaskDetails(
  taskId: string | undefined,
  provider: BoardTreeProvider,
  view: vscode.TreeView<BoardNode>,
) {
  const board = await readBoard();
  let task = taskId ? board.items.find((item) => item.id === taskId) : undefined;
  if (!task) {
    const pick = await promptForTask(board);
    if (!pick) {
      return;
    }
    task = pick;
  }
  const selectedTask = task;
  const columnName = board.columns.find((column) => column.id === selectedTask.columnId)?.name ?? COLUMN_FALLBACK_NAME;
  await provider.revealTask(selectedTask.id, view);
  const detail = buildTaskDetail(selectedTask, columnName);
  const actions = ['Open entry points'];
  if (selectedTask.contextFile) {
    actions.push('Open context');
  }
  actions.push('Generate Codex Prompt');
  const action = await vscode.window.showInformationMessage(
    `${selectedTask.title} (${columnName})`,
    { modal: true, detail },
    ...actions,
  );
  if (action === 'Open entry points') {
    await maybeOpenEntryPoints(selectedTask);
  } else if (action === 'Open context') {
    await openTaskContext(selectedTask);
  } else if (action === 'Generate Codex Prompt') {
    await presentCodexPrompt(selectedTask, columnName);
  }
}

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
  const uri = vscode.Uri.parse(`kanban-task:/task/${task.id}.kanban-task`);
  await vscode.commands.executeCommand('vscode.openWith', uri, 'kanban.taskEditor');
}

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

    // Use TASK-XXX format
    const taskId = createTaskId(board);

    const task: Task = {
      id: taskId,
      columnId: column.id,
      title: 'New Task',
      updatedAt: new Date().toISOString(),
    };
    board.items.push(task);
    await writeBoard(board);
    await provider.refresh();
    await appendTaskHistory(task, `Created in column ${column.name || COLUMN_FALLBACK_NAME}`);

    // Open task in editor tab for immediate editing
    // Note: "task created" notification will show when user saves via Save & Close button
    const uri = vscode.Uri.parse(`kanban-task:/task/${taskId}.kanban-task`);
    await vscode.commands.executeCommand('vscode.openWith', uri, 'kanban.taskEditor');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create task: ${formatError(error)}`);
  }
}

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

async function handleStatusUpdate(
  targetColumnId: string,
  successMessage: string,
  provider: BoardTreeProvider,
  view: vscode.TreeView<BoardNode>,
  node?: BoardNode,
): Promise<void> {
  const board = await readBoard();
  const task = node && node.kind === 'item' ? node.item : await promptForTask(board);
  if (!task) {
    return;
  }
  task.columnId = targetColumnId;
  task.updatedAt = new Date().toISOString();
  await writeBoard(board);
  await provider.refresh();
  const columnName = board.columns.find((c) => c.id === targetColumnId)?.name || COLUMN_FALLBACK_NAME;
  await appendTaskHistory(task, `Moved to ${columnName}`);
  vscode.window.showInformationMessage(`${task.title} — ${successMessage}`);
  await provider.revealTask(task.id, view);
}

/**
 * Set task status using Python CLI (kanban_ops.py status).
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
 * Claim a task using Python CLI (kanban_ops.py claim).
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
 * Spawn a new agent by picking and claiming the highest priority task.
 * Wraps: kanban_ops.py pick --claim
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
    throw new Error(result.stderr || `Failed to spawn agent: exit code ${result.code}`);
  }

  await provider.refresh();
  vscode.window.showInformationMessage(`▶ Agent spawned! ${result.stdout.trim()}`);
}

/**
 * Move the current task to the next phase.
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
 * Generate a refinement prompt with PM feedback.
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
 * Open a workflow file for the user to execute.
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

/**
 * Mark a task as done using Python CLI.
 * Wraps: kanban_ops.py done TASK_ID
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

async function handleImportPlan(provider: BoardTreeProvider, view: vscode.TreeView<BoardNode>): Promise<void> {
  const planDir = await ensurePlanDirectory();
  if (!planDir) {
    return;
  }
  const planFiles = await listPlanFiles(planDir);
  if (!planFiles.length) {
    vscode.window.showInformationMessage('No plan documents found under dev_ops/plans.');
    return;
  }
  type PlanPick = vscode.QuickPickItem & { filePath: string };
  const picks: PlanPick[] = planFiles.map((filePath) => ({
    label: path.basename(filePath),
    description: path.relative(planDir, filePath),
    filePath,
  }));
  const selection = await vscode.window.showQuickPick<PlanPick>(picks, { placeHolder: 'Select a plan to import' });
  if (!selection) {
    return;
  }
  const parsed = await parsePlanFile(selection.filePath);
  if (!parsed.tasks.length) {
    vscode.window.showWarningMessage(`No tasks found in ${selection.label}.`);
    return;
  }
  const board = await readBoard();
  const root = getWorkspaceRoot();
  const relativePlanPath = root ? path.relative(root, parsed.filePath) : parsed.filePath;
  let created = 0;
  let updated = 0;
  let lastTaskId: string | undefined;
  for (const task of parsed.tasks) {
    const columnName = task.column ?? parsed.defaultColumn ?? DEFAULT_COLUMN_NAME;
    const column = findOrCreateColumn(board, columnName);
    const result = upsertPlanTask(board, column, task, parsed, relativePlanPath);
    if (result.kind === 'created') {
      created += 1;
    } else {
      updated += 1;
    }
    await ensureTaskDocument(result.item, task, relativePlanPath, column.name ?? COLUMN_FALLBACK_NAME);
    lastTaskId = result.item.id;
  }
  await writeBoard(board);
  await provider.refresh();
  vscode.window.showInformationMessage(
    `Imported ${created} new and ${updated} existing tasks from ${path.basename(parsed.filePath)}.`,
  );
  if (lastTaskId) {
    await provider.revealTask(lastTaskId, view);
  }
}

async function handleGenerateCodexPrompt(provider: BoardTreeProvider, node?: BoardNode): Promise<void> {
  const board = await readBoard();
  const task = node && node.kind === 'item' ? node.item : await promptForTask(board);
  if (!task) {
    return;
  }
  const columnName = board.columns.find((column) => column.id === task.columnId)?.name ?? COLUMN_FALLBACK_NAME;
  await presentCodexPrompt(task, columnName);
}

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

function getTaskFromNode(node?: BoardNode): Task | undefined {
  if (!node) {
    return undefined;
  }
  if (node.kind === 'item') {
    return node.item;
  }
  return undefined;
}

function getColumnFromAnyNode(board: Board, node?: BoardNode | BoardManagerNode): Column | undefined {
  const columnId = getColumnIdFromNode(node);
  if (!columnId) {
    return undefined;
  }
  return board.columns.find((candidate) => candidate.id === columnId);
}

function getColumnIdFromNode(node?: BoardNode | BoardManagerNode): string | undefined {
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
  const historyPath = path.join(root, 'dev_ops', 'kanban', 'tasks', `${task.id}.md`);
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
 * Create a new user persona via doc_ops.py
 */
async function handleCreateUser(): Promise<void> {
  const title = await vscode.window.showInputBox({
    prompt: 'Enter user persona name',
    placeHolder: 'e.g., Project Manager, Developer',
  });

  if (!title) {
    return;
  }

  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  const result = await runDocOps(['create-user', '--title', title], root);
  if (result.code === 0) {
    vscode.window.showInformationMessage(`✅ Created user persona: ${title}`);
    // Refresh docs view
    await vscode.commands.executeCommand('devops.refreshDocs');
  } else {
    vscode.window.showErrorMessage(`Failed to create user: ${result.stderr || result.stdout}`);
  }
}

/**
 * Create a new user story via doc_ops.py
 */
async function handleCreateStory(): Promise<void> {
  const title = await vscode.window.showInputBox({
    prompt: 'Enter user story title',
    placeHolder: 'e.g., Filter tasks by status',
  });

  if (!title) {
    return;
  }

  const persona = await vscode.window.showInputBox({
    prompt: 'Enter linked user persona (optional)',
    placeHolder: 'e.g., project_manager',
  });

  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  const args = ['create-story', '--title', title];
  if (persona) {
    args.push('--persona', persona);
  }

  const result = await runDocOps(args, root);
  if (result.code === 0) {
    vscode.window.showInformationMessage(`✅ Created user story: ${title}`);
    // Refresh docs view
    await vscode.commands.executeCommand('devops.refreshDocs');
  } else {
    vscode.window.showErrorMessage(`Failed to create story: ${result.stderr || result.stdout}`);
  }
}

/**
 * Create a new architecture doc via doc_ops.py, then create a linked task in Backlog.
 */
async function handleNewArchDoc(): Promise<void> {
  const title = await vscode.window.showInputBox({
    prompt: 'Enter component/module name',
    placeHolder: 'e.g., AuthService, PaymentGateway',
  });

  if (!title) {
    return;
  }

  const componentPath = await vscode.window.showInputBox({
    prompt: 'Enter path to component (optional)',
    placeHolder: 'e.g., src/services/auth.ts',
  });

  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  // Create architecture doc
  const args = ['create', '--type', 'architecture', '--title', title];
  if (componentPath) {
    args.push('--path', componentPath);
  }

  const result = await runDocOps(args, root);
  if (result.code !== 0) {
    vscode.window.showErrorMessage(`Failed to create doc: ${result.stderr || result.stdout}`);
    return;
  }

  // Create linked task in Backlog
  const createTask = await vscode.window.showInformationMessage(
    `✅ Created architecture doc: ${title}`,
    'Create Backlog Task',
    'Skip'
  );

  if (createTask === 'Create Backlog Task') {
    const taskResult = await runBoardOps(
      ['create', '--title', `Implement ${title}`, '--summary', `Implementation for ${title} component`, '--column', 'col-backlog'],
      root
    );
    if (taskResult.code === 0) {
      vscode.window.showInformationMessage(`✅ Created task for ${title}`);
    } else {
      vscode.window.showWarningMessage(`Doc created, but task creation failed: ${taskResult.stderr}`);
    }
  }

  await vscode.commands.executeCommand('devops.refreshDocs');
}

/**
 * Create a new mockup via doc_ops.py
 */
async function handleNewMockup(): Promise<void> {
  const title = await vscode.window.showInputBox({
    prompt: 'Enter mockup name',
    placeHolder: 'e.g., Task Filter Dialog, Kanban Board View',
  });

  if (!title) {
    return;
  }

  const component = await vscode.window.showInputBox({
    prompt: 'Enter component/feature this mockup represents (optional)',
    placeHolder: 'e.g., TaskFilter, BoardView',
  });

  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('No workspace folder open.');
    return;
  }

  const args = ['create-mockup', '--title', title];
  if (component) {
    args.push('--component', component);
  }

  const result = await runDocOps(args, root);
  if (result.code === 0) {
    vscode.window.showInformationMessage(`✅ Created mockup: ${title}`);
    await vscode.commands.executeCommand('devops.refreshDocs');
  } else {
    vscode.window.showErrorMessage(`Failed to create mockup: ${result.stderr || result.stdout}`);
  }
}
