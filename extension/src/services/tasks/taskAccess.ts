import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Board, Column, COLUMN_FALLBACK_NAME } from '../../types';
import { readBoard, writeBoard, getWorkspaceRoot } from '../../services/board/boardPersistence';
import { compareNumbers, compareTasks, isDefined } from '../../services/tasks/taskUtils';
import { Task } from '../../types';
import { formatError } from '../../infrastructure/errors';
import { buildTaskDescription } from './taskPresentation';

export type MoveTasksResult = { movedTaskIds: string[]; columnName: string };

type TaskQuickPickItem = vscode.QuickPickItem & { item: Task };

export async function promptForTask(board: Board): Promise<Task | undefined> {
  if (!board.items.length) {
    vscode.window.showInformationMessage('No Board tasks available.');
    return undefined;
  }
  const quickPickItems: TaskQuickPickItem[] = board.items.sort(compareTasks).map((item) => ({
    label: item.title,
    detail: [item.summary, item.status ? `(${item.status})` : undefined].filter(isDefined).join(' — '),
    description: buildTaskDescription(item),
    item,
  }));
  const pick = await vscode.window.showQuickPick<TaskQuickPickItem>(quickPickItems, { placeHolder: 'Select a task' });
  return pick?.item;
}

export async function promptForColumn(
  board: Board,
  placeHolder: string,
  preselectId?: string,
): Promise<Column | undefined> {
  if (!board.columns.length) {
    vscode.window.showInformationMessage('Create a Board column first.');
    return undefined;
  }
  type ColumnQuickPick = vscode.QuickPickItem & { column: Column };
  const picks: ColumnQuickPick[] = [...board.columns]
    .sort((a, b) => compareNumbers(a.position, b.position))
    .map((column) => ({
      label: column.name || COLUMN_FALLBACK_NAME,
      description: `Position ${column.position ?? 0}`,
      picked: column.id === preselectId,
      column,
    }));
  const selection = await vscode.window.showQuickPick<ColumnQuickPick>(picks, { placeHolder });
  return selection?.column;
}

export async function appendTaskHistory(task: Task, message: string): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    return;
  }
  const historyDir = path.join(root, '.dev_ops', 'board', 'tasks');
  await fs.mkdir(historyDir, { recursive: true });
  const entry = `- [${new Date().toISOString()}] ${message}\n`;
  await fs.appendFile(path.join(historyDir, `${task.id}.md`), entry, 'utf8');
}

export async function maybeOpenEntryPoints(task: Task): Promise<void> {
  if (!task.entryPoints?.length) {
    return;
  }
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('Cannot open entry points: no workspace detected.');
    return;
  }
  const confirmed = await vscode.window.showInformationMessage('Open task entry points?', 'Yes', 'No');
  if (confirmed !== 'Yes') {
    return;
  }
  for (const relative of task.entryPoints) {
    const target = path.isAbsolute(relative) ? relative : path.join(root, relative);
    try {
      const uri = vscode.Uri.file(target);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (error) {
      vscode.window.showWarningMessage(`Unable to open ${relative}: ${formatError(error)}`);
    }
  }
}

export async function openTaskContext(task: Task): Promise<void> {
  if (!task.contextFile) {
    vscode.window.showInformationMessage('This task does not specify a context document.');
    return;
  }
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('Cannot open context: no workspace detected.');
    return;
  }
  const absolute = path.isAbsolute(task.contextFile) ? task.contextFile : path.join(root, task.contextFile);
  try {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(absolute));
    const startLine = Math.max((task.contextRange?.startLine ?? 1) - 1, 0);
    const endLine = Math.max((task.contextRange?.endLine ?? startLine + 1) - 1, startLine);
    await vscode.window.showTextDocument(doc, {
      preview: false,
      selection: new vscode.Range(startLine, 0, Math.min(endLine, doc.lineCount - 1), 0),
    });
  } catch (error) {
    vscode.window.showWarningMessage(`Unable to open context file: ${formatError(error)}`);
  }
}

import { boardService } from '../../services/board/boardService';

export async function moveTasksToColumn(taskIds: string[], columnId: string): Promise<MoveTasksResult> {
  // Read board just to get column name validation
  const board = await readBoard();
  const column = board.columns.find((col) => col.id === columnId);
  if (!column) {
    throw new Error('Target column not found.');
  }

  const updatedIds: string[] = [];

  for (const id of taskIds) {
    try {
      await boardService.moveTask(id, columnId);
      updatedIds.push(id);
      // Status reset is handled by boardService.moveTask
    } catch (e) {
      console.error(`Failed to move task ${id}:`, e);
    }
  }

  if (!updatedIds.length) {
    return { movedTaskIds: [], columnName: column.name || COLUMN_FALLBACK_NAME };
  }

  // No need to writeBoard, boardService handles it.
  return { movedTaskIds: updatedIds, columnName: column.name || COLUMN_FALLBACK_NAME };
}
