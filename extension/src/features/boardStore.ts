import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Board, Column, DEFAULT_COLUMN_BLUEPRINTS } from './types';

export async function ensureBoardUri(): Promise<vscode.Uri> {
  const kanbanPath = await getKanbanPath();
  if (!kanbanPath) {
    throw new Error('Open a workspace folder to load dev_ops/board.json.');
  }
  try {
    await fs.stat(kanbanPath);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      await writeBoard(createEmptyBoard());
    } else {
      throw error;
    }
  }
  return vscode.Uri.file(kanbanPath);
}

export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export async function getKanbanPath(): Promise<string | undefined> {
  const root = getWorkspaceRoot();
  if (!root) {
    return undefined;
  }
  return path.join(root, 'dev_ops', 'board.json');
}

export async function readBoard(): Promise<Board> {
  const p = await getKanbanPath();
  if (!p) {
    throw new Error('Open a workspace folder to use DevOps Kanban.');
  }
  let raw: string | undefined;
  try {
    raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw) as Board;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return createEmptyBoard();
    }
    if (raw !== undefined && error instanceof SyntaxError) {
      return handleCorruptKanbanFile(p, raw);
    }
    throw error;
  }
}

export async function writeBoard(board: Board): Promise<void> {
  const p = await getKanbanPath();
  if (!p) {
    throw new Error('Open a workspace folder to use DevOps Kanban.');
  }
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(board, null, 2), 'utf8');
}

export function createEmptyBoard(): Board {
  return { version: 1, columns: createDefaultColumns(), items: [] };
}

export function createDefaultColumns(): Column[] {
  return DEFAULT_COLUMN_BLUEPRINTS.map((column) => ({ ...column }));
}

export async function registerBoardWatchers(
  provider: { refresh(): Promise<void> },
  context: vscode.ExtensionContext,
): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return;
  }
  let refreshHandle: NodeJS.Timeout | undefined;
  const scheduleRefresh = () => {
    if (refreshHandle) {
      clearTimeout(refreshHandle);
    }
    refreshHandle = setTimeout(() => {
      refreshHandle = undefined;
      provider.refresh().catch((error) => console.error('Kanban refresh failed', error));
    }, 200);
  };
  const patterns = [
    'dev_ops/board.json',
    'dev_ops/artifacts/plans/*.md',
    'dev_ops/docs/research/*.md',
    'dev_ops/docs/tests/*.md',
    'dev_ops/artifacts/bugs/*.md',
    'dev_ops/docs/architecture/*.md',
  ];
  for (const glob of patterns) {
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, glob));
    watcher.onDidCreate(scheduleRefresh, undefined, context.subscriptions);
    watcher.onDidChange(scheduleRefresh, undefined, context.subscriptions);
    watcher.onDidDelete(scheduleRefresh, undefined, context.subscriptions);
    context.subscriptions.push(watcher);
  }
  context.subscriptions.push(
    new vscode.Disposable(() => {
      if (refreshHandle) {
        clearTimeout(refreshHandle);
      }
    }),
  );
}

export async function handleCorruptKanbanFile(filePath: string, contents: string): Promise<Board> {
  const repairOption = 'Repair Kanban board';
  const openOption = 'Open file';
  const selection = await vscode.window.showErrorMessage(
    'DevOps Kanban cannot read dev_ops/board.json because it is not valid JSON.',
    repairOption,
    openOption,
  );
  if (selection === repairOption) {
    const backupPath = await backupCorruptKanbanFile(filePath, contents);
    const repairedBoard = createEmptyBoard();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(repairedBoard, null, 2), 'utf8');
    void vscode.window.showInformationMessage(`Kanban board repaired. Backup stored at ${path.basename(backupPath)}.`);
    return repairedBoard;
  }
  if (selection === openOption) {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(doc, { preview: false });
  }
  throw new Error('dev_ops/board.json is invalid. Repair or fix it, then refresh DevOps Kanban.');
}

export async function backupCorruptKanbanFile(filePath: string, contents: string): Promise<string> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(dir, `kanban.json.corrupt-${timestamp}.bak`);
  await fs.writeFile(backupPath, contents, 'utf8');
  return backupPath;
}
