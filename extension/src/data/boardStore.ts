import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { Board, Column, Task, DEFAULT_COLUMN_BLUEPRINTS } from '../core';

const gzip = promisify(zlib.gzip);

const TASKS_DIR = 'tasks';
const BOARD_FILE = 'board.json';

// --- Paths ---

export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function getDevOpsDir(): string | undefined {
  const root = getWorkspaceRoot();
  if (!root) { return undefined; }
  return path.join(root, '.dev_ops');
}

export function getTasksDir(): string | undefined {
  const dir = getDevOpsDir();
  return dir ? path.join(dir, TASKS_DIR) : undefined;
}

export function getBoardPath(): string | undefined {
  const dir = getDevOpsDir();
  return dir ? path.join(dir, BOARD_FILE) : undefined;
}

export async function ensureBoardUri(): Promise<vscode.Uri> {
  const p = getBoardPath();
  if (!p) { throw new Error('No workspace'); }
  return vscode.Uri.file(p);
}

// --- Public API ---

/**
 * Ensures the board is initialized.
 * Performs one-way migration: If board.json has items, explode them to tasks/ and clear board.json items.
 */
export async function ensureBoardInitialized(): Promise<void> {
  const boardPath = getBoardPath();
  const tasksDir = getTasksDir();
  if (!boardPath || !tasksDir) { return; }

  // Ensure directories
  // NOTE: We only ensure directories if we are about to migrate or write.
  // But strictly speaking, ensureBoardInitialized is often called before reading.
  // If board.json doesn't exist, we should do NOTHING here.

  if (!await fs.stat(boardPath).catch(() => false)) {
    return;
  }

  // Ensure tasks directory if board exists (implied we might need it)
  await fs.mkdir(tasksDir, { recursive: true });

  let boardContent: string;
  try {
    boardContent = await fs.readFile(boardPath, 'utf8');
  } catch {
    // Missing board.json - Do NOT initialize fresh automatically.
    return;
  }

  // Auto-Migration: Extract items if present
  try {
    const board = JSON.parse(boardContent) as Board;
    if (board.items && board.items.length > 0) {
      console.log(`Migrating ${board.items.length} tasks to ${TASKS_DIR}...`);

      await Promise.all(board.items.map(task => {
        return fs.writeFile(
          path.join(tasksDir, `${task.id}.json`),
          JSON.stringify(task, null, 2),
          'utf8'
        );
      }));

      // Clear items from board.json to finalize migration
      board.items = [];
      await fs.writeFile(boardPath, JSON.stringify(board, null, 2), 'utf8');
      vscode.window.showInformationMessage('Project migrated to File-Based Persistence.');
    }
  } catch (error) {
    console.error('Migration check failed', error);
  }
}

/**
 * Reads the full Board object.
 * Hybrids: Layout from board.json + Items from tasks/*.json
 */
export async function readBoard(): Promise<Board> {
  await ensureBoardInitialized();

  const boardPath = getBoardPath();
  if (!boardPath) { throw new Error('No workspace open'); }

  let layout: Board;
  try {
    const raw = await fs.readFile(boardPath, 'utf8');
    layout = JSON.parse(raw);
  } catch (e) {
    // If board.json missing, return in-memory empty board WITHOUT writing file
    return createEmptyBoard();
  }

  // Hydrate Items
  const items: Task[] = [...(layout.items || [])];
  const tasksDir = getTasksDir();

  if (tasksDir) {
    try {
      const files = await fs.readdir(tasksDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const loaded = await Promise.all(jsonFiles.map(async file => {
        try {
          const raw = await fs.readFile(path.join(tasksDir, file), 'utf8');
          return JSON.parse(raw) as Task;
        } catch { return null; }
      }));

      // Merge strategies:
      // If task exists in both, prefer the one from tasksDir (newer architecture)
      // or check timestamps (more complex).
      // Since migration clears board.json items, duplicates should be rare unless
      // external modification happened. We'll simply dedupe by ID, preferring loaded.
      const loadedItems = loaded.filter((t): t is Task => t !== null);

      for (const loadedItem of loadedItems) {
        const index = items.findIndex(t => t.id === loadedItem.id);
        if (index !== -1) {
          items[index] = loadedItem;
        } else {
          items.push(loadedItem);
        }
      }
    } catch {
      // Ignore if dir missing
    }
  }

  return {
    version: layout.version || 1,
    columns: layout.columns || createDefaultColumns(),
    items: items
  };
}

/**
 * Writes the Board Layout (Columns only).
 * Does NOT write items. Items are managed via saveTask.
 */
export async function writeBoard(board: Board): Promise<void> {
  const boardPath = getBoardPath();
  if (!boardPath) { throw new Error('No workspace open'); }

  // Strip items
  const persistenceObject = {
    version: board.version,
    columns: board.columns,
    items: []
  };

  await fs.mkdir(path.dirname(boardPath), { recursive: true });
  await fs.writeFile(boardPath, JSON.stringify(persistenceObject, null, 2), 'utf8');
}

/**
 * Saves a single task to disk.
 */
export async function saveTask(task: Task): Promise<void> {
  const tasksDir = getTasksDir();
  if (!tasksDir) { throw new Error('No workspace open'); }

  await fs.mkdir(tasksDir, { recursive: true });
  const filePath = path.join(tasksDir, `${task.id}.json`);

  // Update timestamp
  task.updatedAt = new Date().toISOString();

  await fs.writeFile(filePath, JSON.stringify(task, null, 2), 'utf8');
}

/**
 * Archive a task (Compress and Remove).
 * Moves TASK-ID.json -> archive/TASK-ID.gz (JSON content zipped)
 */
export async function archiveTaskFile(taskId: string, content: string): Promise<string> {
  const dir = getDevOpsDir();
  if (!dir) { throw new Error('No workspace'); }

  const archiveDir = path.join(dir, 'archive');
  const tasksDir = path.join(dir, TASKS_DIR);
  const taskFile = path.join(tasksDir, `${taskId}.json`);

  await fs.mkdir(archiveDir, { recursive: true });

  // 1. Compress content
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveName = `${taskId}_${timestamp}.json.gz`;
  const archivePath = path.join(archiveDir, archiveName);

  const buffer = Buffer.from(content, 'utf8');
  const compressed = await gzip(buffer);

  await fs.writeFile(archivePath, compressed);

  // 2. Delete source file
  try {
    await fs.unlink(taskFile);
  } catch {
    // Ignore if already gone
  }

  return archivePath;
}

// --- Helper Functions ---

async function initializeFreshBoard(): Promise<void> {
  const p = getBoardPath();
  if (!p) { return; }
  const empty = createEmptyBoard();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(empty, null, 2), 'utf8');
}

export function createEmptyBoard(): Board {
  return { version: 1, columns: createDefaultColumns(), items: [] };
}

export function createDefaultColumns(): Column[] {
  return DEFAULT_COLUMN_BLUEPRINTS.map((column) => ({ ...column }));
}

export async function isProjectInitialized(): Promise<boolean> {
  const boardPath = getBoardPath();
  if (!boardPath) { return false; }
  try {
    await fs.stat(boardPath);
    return true;
  } catch {
    return false;
  }
}

// --- Handling Corruption (Backwards Compat Stub) ---
export async function handleCorruptBoardFile(filePath: string, contents: string): Promise<Board> {
  const backupPath = filePath + '.bak';
  await fs.writeFile(backupPath, contents, 'utf8');
  vscode.window.showErrorMessage(`Corrupt board file detected. Backed up to ${path.basename(backupPath)} and reset.`);
  return createEmptyBoard();
}

export async function backupCorruptBoardFile(filePath: string, contents: string): Promise<string> {
  const backupPath = filePath + '.bak';
  await fs.writeFile(backupPath, contents, 'utf8');
  return backupPath;
}

// --- Context & Meta ---

export async function readCurrentTask(): Promise<string | null> {
  const dir = getDevOpsDir();
  if (!dir) { return null; }
  try {
    return (await fs.readFile(path.join(dir, '.current_task'), 'utf8')).trim() || null;
  } catch { return null; }
}

export async function writeCurrentTask(taskId: string): Promise<void> {
  const dir = getDevOpsDir();
  if (!dir) { throw new Error('No workspace'); }
  await fs.writeFile(path.join(dir, '.current_task'), taskId, 'utf8');
}

export async function clearCurrentTask(): Promise<void> {
  const dir = getDevOpsDir();
  if (dir) { await fs.unlink(path.join(dir, '.current_task')).catch(() => { }); }
}

export async function readTaskContext(taskId: string): Promise<string> {
  const dir = getDevOpsDir();
  if (!dir) { return ''; }
  try {
    return await fs.readFile(path.join(dir, 'context', `${taskId}.md`), 'utf8');
  } catch { return ''; }
}

export async function writeTaskContext(taskId: string, content: string): Promise<void> {
  const dir = getDevOpsDir();
  if (!dir) { return; }
  const ctxDir = path.join(dir, 'context');
  await fs.mkdir(ctxDir, { recursive: true });
  await fs.writeFile(path.join(ctxDir, `${taskId}.md`), content, 'utf8');
}

export async function registerBoardWatchers(
  provider: { refresh(): Promise<void> },
  context: vscode.ExtensionContext,
): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) { return; }

  const patterns = [
    '.dev_ops/board.json',
    '.dev_ops/tasks/*.json'
  ];

  let refreshHandle: NodeJS.Timeout | undefined;
  const scheduleRefresh = () => {
    if (refreshHandle) { clearTimeout(refreshHandle); }
    refreshHandle = setTimeout(() => {
      refreshHandle = undefined;
      provider.refresh().catch(e => console.error('Refresh failed', e));
    }, 200);
  };

  for (const glob of patterns) {
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, glob));
    watcher.onDidCreate(scheduleRefresh);
    watcher.onDidChange(scheduleRefresh);
    watcher.onDidDelete(scheduleRefresh);
    context.subscriptions.push(watcher);
  }
}
