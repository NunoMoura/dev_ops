import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { KanbanBoard, KanbanColumn, DEFAULT_COLUMN_BLUEPRINTS } from './types';

export async function ensureKanbanUri(): Promise<vscode.Uri> {
  const kanbanPath = await getKanbanPath();
  if (!kanbanPath) {
    throw new Error('Open a workspace folder to load local/kanban.json.');
  }
  try {
    await fs.stat(kanbanPath);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      await writeKanban(createEmptyBoard());
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
  return path.join(root, 'local', 'kanban.json');
}

export async function readKanban(): Promise<KanbanBoard> {
  const p = await getKanbanPath();
  if (!p) {
    throw new Error('Open a workspace folder to use Titan Kanban.');
  }
  let raw: string | undefined;
  try {
    raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw) as KanbanBoard;
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

export async function writeKanban(board: KanbanBoard): Promise<void> {
  const p = await getKanbanPath();
  if (!p) {
    throw new Error('Open a workspace folder to use Titan Kanban.');
  }
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(board, null, 2), 'utf8');
}

export function createEmptyBoard(): KanbanBoard {
  return { version: 1, columns: createDefaultColumns(), items: [] };
}

export function createDefaultColumns(): KanbanColumn[] {
  return DEFAULT_COLUMN_BLUEPRINTS.map((column) => ({ ...column }));
}

export async function registerKanbanWatchers(
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
    'local/kanban.json',
    'local/tasks/*.md',
    'local/plans/*.md',
    'local/plans/*.json',
    'local/plans/*.jsonc',
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

export async function handleCorruptKanbanFile(filePath: string, contents: string): Promise<KanbanBoard> {
  const repairOption = 'Repair Kanban board';
  const openOption = 'Open file';
  const selection = await vscode.window.showErrorMessage(
    'Titan Kanban cannot read local/kanban.json because it is not valid JSON.',
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
  throw new Error('local/kanban.json is invalid. Repair or fix it, then refresh Titan Kanban.');
}

export async function backupCorruptKanbanFile(filePath: string, contents: string): Promise<string> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(dir, `kanban.json.corrupt-${timestamp}.bak`);
  await fs.writeFile(backupPath, contents, 'utf8');
  return backupPath;
}
