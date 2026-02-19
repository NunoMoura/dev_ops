import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { Board, Column, Task } from '../../types';

const gzip = promisify(zlib.gzip);

const TASKS_DIR = 'tasks';
const BOARD_FILE = 'board.json';

export const DEFAULT_COLUMN_BLUEPRINTS = [
  { id: 'col-backlog', name: 'Backlog' },
  { id: 'col-understand', name: 'Understand' },
  { id: 'col-plan', name: 'Plan' },
  { id: 'col-implement', name: 'Implement' },
  { id: 'col-verify', name: 'Verify' },
  { id: 'col-done', name: 'Done' }
];

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

export function getTaskBundleDir(taskId: string): string | undefined {
  const tasksDir = getTasksDir();
  return tasksDir ? path.join(tasksDir, taskId) : undefined;
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
/**
 * Ensures the board is initialized.
 * Performs migration from flat files to bundles if needed.
 */
export async function ensureBoardInitialized(): Promise<void> {
  const boardPath = getBoardPath();
  const tasksDir = getTasksDir();
  if (!boardPath || !tasksDir) { return; }

  if (!await fs.stat(boardPath).catch(() => false)) {
    return;
  }

  // Ensure tasks directory
  await fs.mkdir(tasksDir, { recursive: true });

  // Run Migration
  await migrateToBundles(tasksDir);
}

/**
 * Migrates flat task files to Task Bundles.
 * Structure: .dev_ops/tasks/T-1.json -> .dev_ops/tasks/T-1/task.json
 * Context:   .dev_ops/context/T-1.md -> .dev_ops/tasks/T-1/context.md
 */
async function migrateToBundles(tasksDir: string): Promise<void> {
  try {
    const entries = await fs.readdir(tasksDir, { withFileTypes: true });

    // Find flat JSON files
    const flatFiles = entries.filter(e => e.isFile() && e.name.endsWith('.json'));

    for (const file of flatFiles) {
      const taskId = path.basename(file.name, '.json');
      const bundleDir = path.join(tasksDir, taskId);
      const oldJsonPath = path.join(tasksDir, file.name);
      const newJsonPath = path.join(bundleDir, 'task.json');

      // 1. Create Bundle Directory
      await fs.mkdir(bundleDir, { recursive: true });

      // 2. Move JSON
      await fs.rename(oldJsonPath, newJsonPath);

      // 3. Move Context (if exists)
      const devOpsDir = getDevOpsDir();
      if (devOpsDir) {
        const oldContextPath = path.join(devOpsDir, 'context', `${taskId}.md`);
        const newTracePath = path.join(bundleDir, 'decision_trace.md');

        try {
          // Check if context exists
          if (await fs.stat(oldContextPath).catch(() => false)) {
            await fs.rename(oldContextPath, newTracePath);
          }
        } catch (e) {
          // Ignore context move errors
          console.error(`Failed to migrate context for ${taskId}`, e);
        }
      }
    }

    // Cleanup empty context dir if strict? verify logic
    // We leave the context folder for now to avoid accidental deletion of non-migrated stuff
  } catch (e) {
    console.error('Migration failed', e);
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

  // Hydrate Items (if needed, or merge with index)
  const items: Task[] = [];
  const tasksDir = getTasksDir();

  if (tasksDir) {
    try {
      const entries = await fs.readdir(tasksDir, { withFileTypes: true });
      // Filter for directories (Task Bundles)
      const bundleDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

      const loaded = await Promise.all(bundleDirs.map(async bundleName => {
        try {
          const taskPath = path.join(tasksDir, bundleName, 'task.json');
          if (!await fs.stat(taskPath).catch(() => false)) { return null; }

          const raw = await fs.readFile(taskPath, 'utf8');
          return JSON.parse(raw) as Task;
        } catch { return null; }
      }));

      items.push(...loaded.filter((t): t is Task => t !== null));
    } catch {
      // Ignore if dir missing
    }
  }

  // Ensure every column has taskIds initialized
  for (const col of layout.columns) {
    if (!col.taskIds) {
      col.taskIds = [];
    }
  }

  // Organize items by column
  const itemsByColumn: Record<string, Task[]> = {};
  for (const task of items) {
    if (!itemsByColumn[task.columnId]) {
      itemsByColumn[task.columnId] = [];
    }
    itemsByColumn[task.columnId].push(task);
  }

  // Reconstruct sorted items list
  const sortedItems: Task[] = [];
  const processedTaskIds = new Set<string>();
  let layoutDirty = false;

  for (const col of layout.columns) {
    const colItems = itemsByColumn[col.id] || [];
    const colTaskIds = col.taskIds || [];

    // 0. Prune stale IDs (task files that no longer exist on disk)
    const validTaskIds = colTaskIds.filter(id => colItems.some(t => t.id === id));
    if (validTaskIds.length !== colTaskIds.length) {
      col.taskIds = validTaskIds;
      layoutDirty = true;
    }

    // 1. Add items in the order specified by taskIds
    for (const id of validTaskIds) {
      const task = colItems.find(t => t.id === id);
      if (task) {
        sortedItems.push(task);
        processedTaskIds.add(task.id);
      }
    }

    // 2. Append any items found on disk but not in taskIds (newly discovered or legacy)
    const newItems = colItems.filter(t => !processedTaskIds.has(t.id));
    // Sort new items by ID to be deterministic
    newItems.sort((a, b) => a.id.localeCompare(b.id));

    if (newItems.length > 0) {
      layoutDirty = true;
    }

    for (const task of newItems) {
      sortedItems.push(task);
      col.taskIds!.push(task.id); // Update the layout in-memory so it saves correctly later
      processedTaskIds.add(task.id);
    }
  }

  // Handle orphaned items (column not found in layout)
  // These might be in a column that was deleted. Move them to backlog? 
  // For now, just append them so they aren't lost.
  const orphaned = items.filter(t => !processedTaskIds.has(t.id));
  if (orphaned.length > 0) {
    // Find backlog
    const backlog = layout.columns.find(c => c.id === 'col-backlog') || layout.columns[0];
    if (backlog) {
      for (const task of orphaned) {
        task.columnId = backlog.id;
        sortedItems.push(task);
        if (!backlog.taskIds) { backlog.taskIds = []; }
        backlog.taskIds.push(task.id);
        layoutDirty = true;
      }
    } else {
      // Just return them, they might display weirdly but won't be lost
      sortedItems.push(...orphaned);
    }
  }

  // Persist the reconciled layout if it drifted
  if (layoutDirty) {
    // We don't await here to avoid blocking read, but we should probably catch errors
    // Actually, awaiting is safer to ensure consistency before next read
    const updatedLayout = {
      version: layout.version || 1,
      columns: layout.columns
    };
    // Fire and forget or await? Await is safer for tests.
    try {
      await fs.writeFile(boardPath, JSON.stringify(updatedLayout, null, 2), 'utf8');
      // console.log('Board layout reconciled and saved.');
    } catch (error) {
      console.error('Failed to save reconciled board layout:', error);
    }
  }

  return {
    version: layout.version || 1,
    columns: layout.columns || createDefaultColumns(),
    items: sortedItems
  };
}

/**
 * Writes the Board Layout (Columns only).
 * Does NOT write items. Items are managed via saveTask.
 */
/**
 * Writes the FULL Board (Layout + Items) to board.json.
 * This acts as the Cached Index.
 */
export async function writeBoard(board: Board): Promise<void> {
  const boardPath = getBoardPath();
  if (!boardPath) { throw new Error('No workspace open'); }

  await fs.mkdir(path.dirname(boardPath), { recursive: true });
  await fs.writeFile(boardPath, JSON.stringify(board, null, 2), 'utf8');
}

/**
 * Saves a single task to disk.
 */
/**
 * Saves a single task bundle to disk (task.json in subfolder).
 * Does NOT update board.json (Index). Service must handle that.
 */
export async function saveTask(task: Task): Promise<void> {
  const tasksDir = getTasksDir();
  if (!tasksDir) { throw new Error('No workspace open'); }

  const bundleDir = path.join(tasksDir, task.id);
  await fs.mkdir(bundleDir, { recursive: true });

  const filePath = path.join(bundleDir, 'task.json');

  // Update timestamp
  task.updatedAt = new Date().toISOString();

  await fs.writeFile(filePath, JSON.stringify(task, null, 2), 'utf8');
}

/**
 * Deletes a single task file from disk.
 */
export async function deleteTask(taskId: string): Promise<void> {
  const bundleDir = getTaskBundleDir(taskId);
  if (!bundleDir) { throw new Error('No workspace open'); }

  try {
    await fs.rm(bundleDir, { recursive: true, force: true });
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

/**
 * Archive a task (Compress and Remove).
 * Moves TASK-ID.json -> archive/TASK-ID.gz (JSON content zipped)
 */
/**
 * Archive a task bundle (Move to archive folder).
 * Moves tasks/TASK-ID -> archive/TASK-ID
 */
export async function archiveTaskBundle(taskId: string): Promise<string> {
  const dir = getDevOpsDir();
  const tasksDir = getTasksDir();
  if (!dir || !tasksDir) { throw new Error('No workspace'); }

  const archiveDir = path.join(dir, 'archive');
  const bundleDir = path.join(tasksDir, taskId);
  const destDir = path.join(archiveDir, taskId);

  if (!await fs.stat(bundleDir).catch(() => false)) {
    throw new Error(`Task bundle not found: ${taskId}`);
  }

  await fs.mkdir(archiveDir, { recursive: true });

  // Rename folder (Move)
  // If dest exists, we might overwrite or error. Let's error for safety or append timestamp?
  // User wanted "Archives".
  if (await fs.stat(destDir).catch(() => false)) {
    // Conflict: Append timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.rename(bundleDir, path.join(archiveDir, `${taskId}_${timestamp}`));
  } else {
    await fs.rename(bundleDir, destDir);
  }

  return destDir;
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
  return DEFAULT_COLUMN_BLUEPRINTS.map((column, index) => ({
    ...column,
    position: index + 1,
  }));
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

export async function readDecisionTrace(taskId: string): Promise<string> {
  const bundleDir = getTaskBundleDir(taskId);
  if (!bundleDir) { return ''; }
  try {
    return await fs.readFile(path.join(bundleDir, 'decision_trace.md'), 'utf8');
  } catch { return ''; }
}

export async function writeDecisionTrace(taskId: string, content: string): Promise<void> {
  const bundleDir = getTaskBundleDir(taskId);
  if (!bundleDir) { return; }
  await fs.mkdir(bundleDir, { recursive: true });
  await fs.writeFile(path.join(bundleDir, 'decision_trace.md'), content, 'utf8');
}

export async function registerBoardWatchers(
  provider: { refresh(): Promise<void> },
  context: vscode.ExtensionContext,
): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) { return; }

  const patterns = [
    '.dev_ops/board.json',
    '.dev_ops/tasks/**' // Watch all files/folders in tasks dir to catch folder deletions
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
