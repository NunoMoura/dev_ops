import * as vscode from 'vscode';
import * as path from 'path';

// Import registration functions from domain modules
import { registerTaskCommands } from './taskCommands';
import { registerColumnCommands } from './columnCommands';
import { registerWorkflowCommands } from './workflowCommands';
import { registerDocumentCommands } from './documentCommands';

// Re-export shared handlers for use by extension.ts, board webview, and task editor
export {
  handleBoardMoveTasks,
  handleBoardOpenTask,
  handleCardUpdateMessage,
  handleCardDeleteMessage,
  handleArchiveAll,
  handleArchiveSingle,
  handleBoardDeleteTasks,
} from './sharedHandlers';

// Re-export types for consumers
export type { DevOpsCommandServices, MoveTasksRequest } from './types';

// Import utilities
import { registerDevOpsCommand } from './utils';
import { readBoard, writeBoard, getWorkspaceRoot } from '../../data';
import type { BoardTreeProvider, BoardNode } from '../../ui/board';
import type { DevOpsCommandServices } from './types';
import { DEFAULT_COLUMN_NAME, COLUMN_FALLBACK_NAME } from '../../core';
import {
  ensurePlanDirectory,
  listPlanFiles,
  parsePlanFile,
  findOrCreateColumn,
  upsertPlanTask,
  ensureTaskDocument,
} from '../../services/planning';

/**
 * Register all DevOps board commands
 * This is the main entry point called by extension.ts
 */
export function registerBoardCommands(
  context: vscode.ExtensionContext,
  services: DevOpsCommandServices,
  syncFilterUI: () => void,
): void {
  // Register domain-specific command modules
  registerTaskCommands(context, services, syncFilterUI);
  registerColumnCommands(context, services);
  registerWorkflowCommands(context, services);
  registerDocumentCommands(context);

  // Register core board commands that don't fit into specific domains
  registerCoreCommands(context, services);
}

/**
 * Register core board commands (non-domain-specific utilities)
 */
function registerCoreCommands(
  context: vscode.ExtensionContext,
  services: DevOpsCommandServices,
): void {
  const { provider, boardView } = services;

  // Note: devops.openBoard is registered in boardView.ts (opens the webview panel)

  registerDevOpsCommand(
    context,
    'devops.getTasks',
    async () => {
      const board = await readBoard();
      const doc = await vscode.workspace.openTextDocument({
        language: 'json',
        content: JSON.stringify(board, null, 2),
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    },
    'Unable to load Board tasks',
  );

  registerDevOpsCommand(
    context,
    'devops.refreshBoard',
    async () => {
      await provider.refresh();
    },
    'Unable to refresh board',
  );

  registerDevOpsCommand(
    context,
    'devops.openSettings',
    async () => {
      // Open extension settings filtered to DevOps
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:NunoMoura.dev-ops');
    },
    'Unable to open settings',
  );

  registerDevOpsCommand(
    context,
    'devops.importPlan',
    async () => {
      await handleImportPlan(provider, boardView);
    },
    'Unable to import plan',
  );
}

/**
 * Import a plan from markdown file
 */
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
