import * as vscode from 'vscode';
import * as path from 'path';
import { KanbanCardViewProvider, CardTaskPayload } from '../cardView';
import { KanbanTreeProvider, KanbanNode, KanbanManagerNode } from '../ui/providers';
import {
  Board,
  Column,
  Task,
  COLUMN_FALLBACK_NAME,
  DEFAULT_COLUMN_NAME,
} from '../features/types';
import { readKanban, writeKanban, ensureKanbanUri, getWorkspaceRoot } from '../features/boardStore';
import {
  compareNumbers,
  compareTasks,
  createId,
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
  provider: KanbanTreeProvider;
  kanbanView: vscode.TreeView<KanbanNode>;
  cardViewProvider: KanbanCardViewProvider;
};

export function registerKanbanCommands(
  context: vscode.ExtensionContext,
  services: KanbanCommandServices,
  syncFilterUI: () => void,
): void {
  const { provider, cardViewProvider, kanbanView } = services;

  registerKanbanCommand(
    context,
    'kanban.openBoard',
    async () => {
      const uri = await ensureKanbanUri();
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    },
    'Unable to open board',
  );

  registerKanbanCommand(
    context,
    'kanban.pickNextTask',
    async () => {
      await handlePickNextTask(provider, kanbanView);
    },
    'Unable to pick next task',
  );

  registerKanbanCommand(
    context,
    'kanban.showTaskDetails',
    async (taskId?: string) => {
      await handleShowTaskDetails(taskId, provider, kanbanView);
    },
    'Unable to show task details',
  );

  registerKanbanCommand(
    context,
    'kanban.getTasks',
    async () => {
      const board = await readKanban();
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
    async (node?: KanbanNode | KanbanManagerNode) => {
      await handleRenameColumn(provider, node);
    },
    'Unable to rename column',
  );

  registerKanbanCommand(
    context,
    'kanban.deleteColumn',
    async (node?: KanbanNode | KanbanManagerNode) => {
      await handleDeleteColumn(provider, node);
    },
    'Unable to delete column',
  );

  registerKanbanCommand(
    context,
    'kanban.createTask',
    async (node?: KanbanNode) => {
      await handleCreateTask(provider, cardViewProvider, node);
    },
    'Unable to create task',
  );

  registerKanbanCommand(
    context,
    'kanban.moveTask',
    async (node?: KanbanNode) => {
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

  registerKanbanCommand(
    context,
    'kanban.toggleAgentReadyFilter',
    async () => {
      await provider.toggleAgentReadyFilter();
      syncFilterUI();
    },
    'Unable to toggle agent filter',
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
    async (node?: KanbanNode) => {
      await handleGenerateCodexPrompt(provider, node);
    },
    'Unable to build Codex prompt',
  );

  registerKanbanCommand(
    context,
    'kanban.openEntryPoints',
    async (node?: KanbanNode) => {
      await handleOpenEntryPoints(node);
    },
    'Unable to open entry points',
  );

  registerKanbanCommand(
    context,
    'kanban.openTaskContext',
    async (node?: KanbanNode) => {
      await handleOpenTaskContext(node);
    },
    'Unable to open task context',
  );

  registerKanbanCommand(
    context,
    'kanban.showCardDetails',
    async (taskId?: string) => {
      await handleShowCardDetails(taskId, cardViewProvider);
    },
    'Unable to open card details',
  );

  registerKanbanCommand(
    context,
    'kanban.markTaskInProgress',
    async (node?: KanbanNode) => {
      await handleStatusUpdate('col-inprogress', 'Marked In Progress', provider, kanbanView, node);
    },
    'Unable to update status',
  );

  registerKanbanCommand(
    context,
    'kanban.markTaskBlocked',
    async (node?: KanbanNode) => {
      await handleStatusUpdate('col-blocked', 'Marked Blocked', provider, kanbanView, node);
    },
    'Unable to update status',
  );

  registerKanbanCommand(
    context,
    'kanban.markTaskDone',
    async (node?: KanbanNode) => {
      await handleStatusUpdate('col-done', 'Marked Done', provider, kanbanView, node);
    },
    'Unable to update status',
  );
}

export async function handleBoardMoveTasks(request: MoveTasksRequest, provider: KanbanTreeProvider): Promise<void> {
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

export async function handleBoardOpenTask(taskId: string, cardView: KanbanCardViewProvider): Promise<void> {
  if (!taskId) {
    return;
  }
  try {
    const board = await readKanban();
    const task = board.items.find((item) => item.id === taskId);
    if (!task) {
      vscode.window.showWarningMessage('Task not found on the current Kanban board.');
      return;
    }
    const columnName = board.columns.find((column) => column.id === task.columnId)?.name ?? COLUMN_FALLBACK_NAME;
    cardView.showTask(buildCardPayload(task, columnName));
    void vscode.commands.executeCommand('kanbanCardView.focus');
  } catch (error) {
    vscode.window.showErrorMessage(`Unable to open task: ${formatError(error)}`);
  }
}

export async function handleCardUpdateMessage(
  update: CardTaskPayload,
  provider: KanbanTreeProvider,
  cardView: KanbanCardViewProvider,
  syncFilterUI: () => void,
): Promise<void> {
  try {
    if (!update.id) {
      throw new Error('Missing task id');
    }
    const board = await readKanban();
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
    task.agentReady = Boolean(update.agentReady);
    task.updatedAt = new Date().toISOString();
    await writeKanban(board);
    await provider.refresh();
    syncFilterUI();
    const columnName = board.columns.find((column) => column.id === task.columnId)?.name ?? COLUMN_FALLBACK_NAME;
    cardView.showTask(buildCardPayload(task, columnName));
  } catch (error) {
    vscode.window.showErrorMessage(`Unable to save task: ${formatError(error)}`);
  }
}

export async function handleCardDeleteMessage(
  taskId: string,
  provider: KanbanTreeProvider,
  cardView: KanbanCardViewProvider,
  syncFilterUI: () => void,
): Promise<void> {
  try {
    if (!taskId) {
      throw new Error('Missing task id');
    }
    const board = await readKanban();
    const index = board.items.findIndex((item) => item.id === taskId);
    if (index === -1) {
      throw new Error('Task not found in board');
    }
    const task = board.items[index];
    const confirmDelete = 'Delete Feature';
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
    await writeKanban(board);
    await provider.refresh();
    syncFilterUI();
    cardView.showTask(undefined);
    vscode.window.showInformationMessage('Task deleted.');
  } catch (error) {
    vscode.window.showErrorMessage(`Unable to delete task: ${formatError(error)}`);
  }
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

async function handlePickNextTask(provider: KanbanTreeProvider, view: vscode.TreeView<KanbanNode>) {
  const board = await readKanban();
  if (!board.items.length) {
    vscode.window.showInformationMessage('No tasks found in dev_ops/kanban/board.json.');
    return;
  }
  const ranked = [...board.items].sort(compareTasks);
  const quickPickItems = ranked.map((item) => ({
    label: item.title,
    detail: [item.summary, item.agentReady ? '(agentReady)' : undefined].filter(isDefined).join(' — '),
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
  provider: KanbanTreeProvider,
  view: vscode.TreeView<KanbanNode>,
) {
  const board = await readKanban();
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

async function handleShowCardDetails(taskId: string | undefined, cardView: KanbanCardViewProvider): Promise<void> {
  const board = await readKanban();
  let task = taskId ? board.items.find((item) => item.id === taskId) : undefined;
  if (!task) {
    task = await promptForTask(board);
    if (!task) {
      cardView.showTask(undefined);
      return;
    }
  }
  const columnName = board.columns.find((column) => column.id === task.columnId)?.name ?? COLUMN_FALLBACK_NAME;
  cardView.showTask(buildCardPayload(task, columnName));
  void vscode.commands.executeCommand('kanbanCardView.focus');
}

async function handleCreateColumn(provider: KanbanTreeProvider): Promise<void> {
  const board = await readKanban();
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
  await writeKanban(board);
  await provider.refresh();
  vscode.window.showInformationMessage(`Created column "${column.name}".`);
}

async function handleRenameColumn(provider: KanbanTreeProvider, node?: KanbanNode | KanbanManagerNode): Promise<void> {
  const board = await readKanban();
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
  await writeKanban(board);
  await provider.refresh();
  vscode.window.showInformationMessage(`Renamed column to "${column.name}".`);
}

async function handleDeleteColumn(provider: KanbanTreeProvider, node?: KanbanNode | KanbanManagerNode): Promise<void> {
  const board = await readKanban();
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
  await writeKanban(board);
  await provider.refresh();
  const relocated = targetColumn ? ` Cards moved to ${targetColumn.name || COLUMN_FALLBACK_NAME}.` : '';
  vscode.window.showInformationMessage(`Deleted column "${column.name || COLUMN_FALLBACK_NAME}".${relocated}`);
}

async function handleCreateTask(
  provider: KanbanTreeProvider,
  cardView: KanbanCardViewProvider,
  node?: KanbanNode,
): Promise<void> {
  const board = await readKanban();
  const column = node && node.kind === 'column' ? node.column : findOrCreateColumn(board, DEFAULT_COLUMN_NAME);
  const task: Task = {
    id: createId('task', 'new task'),
    columnId: column.id,
    title: 'New Task',
    updatedAt: new Date().toISOString(),
  };
  board.items.push(task);
  await writeKanban(board);
  await provider.refresh();
  await appendTaskHistory(task, `Created in column ${column.name || COLUMN_FALLBACK_NAME}`);
  const columnName = column.name ?? COLUMN_FALLBACK_NAME;
  cardView.showTask(buildCardPayload(task, columnName));
  void vscode.commands.executeCommand('kanbanCardView.focus');
}

async function handleMoveTask(
  provider: KanbanTreeProvider,
  view: vscode.TreeView<KanbanNode>,
  node?: KanbanNode,
): Promise<void> {
  const board = await readKanban();
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
  await writeKanban(board);
  await provider.refresh();
  await appendTaskHistory(task, `Moved to column ${targetColumn.name || COLUMN_FALLBACK_NAME}`);
  await provider.revealTask(task.id, view);
}

async function handleStatusUpdate(
  targetColumnId: string,
  successMessage: string,
  provider: KanbanTreeProvider,
  view: vscode.TreeView<KanbanNode>,
  node?: KanbanNode,
): Promise<void> {
  const board = await readKanban();
  const task = node && node.kind === 'item' ? node.item : await promptForTask(board);
  if (!task) {
    return;
  }
  task.columnId = targetColumnId;
  task.updatedAt = new Date().toISOString();
  await writeKanban(board);
  await provider.refresh();
  const columnName = board.columns.find((c) => c.id === targetColumnId)?.name || COLUMN_FALLBACK_NAME;
  await appendTaskHistory(task, `Moved to ${columnName}`);
  vscode.window.showInformationMessage(`${task.title} — ${successMessage}`);
  await provider.revealTask(task.id, view);
}

async function handleFilterTasks(provider: KanbanTreeProvider): Promise<void> {
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

async function handleImportPlan(provider: KanbanTreeProvider, view: vscode.TreeView<KanbanNode>): Promise<void> {
  const planDir = await ensurePlanDirectory();
  if (!planDir) {
    return;
  }
  const planFiles = await listPlanFiles(planDir);
  if (!planFiles.length) {
    vscode.window.showInformationMessage('No plan documents found under local/plans.');
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
  const board = await readKanban();
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
  await writeKanban(board);
  await provider.refresh();
  vscode.window.showInformationMessage(
    `Imported ${created} new and ${updated} existing tasks from ${path.basename(parsed.filePath)}.`,
  );
  if (lastTaskId) {
    await provider.revealTask(lastTaskId, view);
  }
}

async function handleGenerateCodexPrompt(provider: KanbanTreeProvider, node?: KanbanNode): Promise<void> {
  const board = await readKanban();
  const task = node && node.kind === 'item' ? node.item : await promptForTask(board);
  if (!task) {
    return;
  }
  const columnName = board.columns.find((column) => column.id === task.columnId)?.name ?? COLUMN_FALLBACK_NAME;
  await presentCodexPrompt(task, columnName);
}

async function handleOpenEntryPoints(node?: KanbanNode): Promise<void> {
  const board = await readKanban();
  let task = getTaskFromNode(node);
  if (!task) {
    task = await promptForTask(board);
  }
  if (!task) {
    return;
  }
  await maybeOpenEntryPoints(task);
}

async function handleOpenTaskContext(node?: KanbanNode): Promise<void> {
  const board = await readKanban();
  let task = getTaskFromNode(node);
  if (!task) {
    task = await promptForTask(board);
  }
  if (!task) {
    return;
  }
  await openTaskContext(task);
}

function getTaskFromNode(node?: KanbanNode): Task | undefined {
  if (!node) {
    return undefined;
  }
  if (node.kind === 'item') {
    return node.item;
  }
  return undefined;
}

function getColumnFromAnyNode(board: Board, node?: KanbanNode | KanbanManagerNode): Column | undefined {
  const columnId = getColumnIdFromNode(node);
  if (!columnId) {
    return undefined;
  }
  return board.columns.find((candidate) => candidate.id === columnId);
}

function getColumnIdFromNode(node?: KanbanNode | KanbanManagerNode): string | undefined {
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
