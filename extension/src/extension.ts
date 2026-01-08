import * as vscode from 'vscode';
import { BoardPanelManager, createBoardPanelManager } from './views/board/BoardPanelView';
import { BoardTreeProvider } from './views/board/BoardTreeProvider';
import {
  registerBoardCommands,
  handleBoardMoveTasks,
  handleBoardOpenTask,
  handleArchiveAll,
  handleArchiveSingle,
  DevOpsCommandServices,
} from './handlers';
import { registerInitializeCommand } from './handlers/initializeCommand';
import { readBoard, writeBoard, registerBoardWatchers, isProjectInitialized } from './features/boardStore';
import { formatError } from './core';
import { showPhaseNotification } from './features/phaseNotifications';
import { createStatusBar, StatusBarManager } from './statusBar';
import { TaskEditorProvider } from './views/task/TaskEditorProvider';
// NEW Providers
import { DashboardViewProvider } from './views/dashboard/DashboardViewProvider';
import { MetricsViewProvider } from './views/metrics/MetricsViewProvider';

import { SessionBridge } from './features/sessionBridge';
import { CursorBridge } from './features/cursorBridge';
import { AgentManager, registerAgentManager } from './agents/AgentManager';
import { AntigravityAdapter } from './agents/AntigravityAdapter';
import { CursorAdapter } from './agents/CursorAdapter';
import { registerTaskProvider } from './providers/taskProvider';
import { registerCodeLensProvider } from './providers/codeLensProvider';
import { registerSCMDecorations } from './scm/scmDecorator';
import { registerTestController } from './testExplorer/testController';
import { log, warn, error as logError } from './core';

export async function activate(context: vscode.ExtensionContext) {
  log('DevOps extension v0.0.1 activating...');
  // Don't show activation message here - too noisy. User will see initialization prompt if needed.
  try {
    // Register DevOps: Initialize command first (always works)
    log('[Activation] Step 1: Registering initialize command');
    context.subscriptions.push(registerInitializeCommand(context));
    log('[Activation] Step 1 complete');

    // Register task editor for opening tasks in tabs
    log('[Activation] Step 2: Registering task editor');
    context.subscriptions.push(TaskEditorProvider.register(context));
    log('[Activation] Step 2 complete');

    log('[Activation] Step 3: Initializing DevOps services...');
    const services = await initializeDevOpsServices(context);
    log('[Activation] Step 3 complete');

    // Onboarding and initialization are handled by DashboardViewProvider
    // When user completes the onboarding form, it triggers devops.initialize

    // Listen for onboarding completion to refresh views
    services.dashboard.onDidComplete(() => {
      services.provider.refresh();
      services.dashboard.refresh();
      services.metricsView.updateContent();
    });

    log('[Activation] Step 4: Binding views');
    bindDevOpsViews(context, services);
    log('[Activation] Step 4 complete');

    try {
      await services.provider.refresh();
      services.dashboard.refresh();
      services.metricsView.updateContent();
    } catch (error) {
      warn(`Board not loaded on activation: ${error}`);
    }

    await registerBoardWatchers(services.provider, context);
    // Also watch for updates to refresh dashboard and metrics
    context.subscriptions.push(
      services.provider.onDidUpdateBoardView(() => {
        services.dashboard.refresh();
        services.metricsView.updateContent();
      })
    );

    registerBoardCommands(context, services, services.syncFilterUI);

    // Initialize Session Bridge
    const sessionBridge = new SessionBridge(context);
    sessionBridge.activate();

    // NOTE: CursorBridge should NOT auto-activate - it creates .cursor/tasks
    // which is inappropriate before initialization and wrong for non-Cursor IDEs.
    // Initialize Cursor Bridge only if needed and initialized
    // const cursorBridge = new CursorBridge(context);
    // if (initialized && isCursorIDE()) {
    //   cursorBridge.activate();
    // }

    // Register task provider
    registerTaskProvider(context);

    // Register CodeLens provider
    registerCodeLensProvider(context);

    // Register SCM decorations
    registerSCMDecorations(context);

    // Register test controller
    registerTestController(context);

    // Initialize Agent Manager
    const agentManager = AgentManager.getInstance();
    agentManager.registerAdapter(new AntigravityAdapter());
    agentManager.registerAdapter(new CursorAdapter());
    registerAgentManager(context);

    // Check if existing .dev_ops/ needs framework files update
    await checkAndUpdateFramework(context);

    // Auto-open board tab when extension activates
    try {
      // Note: Board will show onboarding if not initialized
      await vscode.commands.executeCommand('devops.openBoard');
      log('Board automatically opened');
    } catch (error) {
      warn(`Board auto-open skipped: ${formatError(error)}`);
    }

    log('DevOps extension activated successfully');
  } catch (error) {
    logError('DevOps extension activation failed', error);
    vscode.window.showErrorMessage(`DevOps extension failed to activate: ${formatError(error)}`);
  }
}

/**
 * Check if existing .dev_ops/ project needs framework files update.
 * Runs silently on activation to ensure scripts, templates, etc. are present.
 */
async function checkAndUpdateFramework(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const fs = require('fs');
  const path = require('path');

  const devOpsDir = path.join(workspaceRoot, '.dev_ops');
  const scriptsDir = path.join(devOpsDir, 'scripts');
  const boardPath = path.join(devOpsDir, 'board.json');

  // Check if project is initialized (.dev_ops/board.json exists) but missing scripts
  if (fs.existsSync(boardPath) && !fs.existsSync(scriptsDir)) {
    log('Detected existing project missing framework files, updating...');
    try {
      await vscode.commands.executeCommand('devops.initialize');
      log('Framework files updated successfully');
    } catch (error) {
      warn(`Framework update failed: ${formatError(error)}`);
    }
  }
}

export function deactivate() { }

type DevOpsExtensionServices = DevOpsCommandServices & {
  boardPanelManager: BoardPanelManager;
  statusBar: StatusBarManager;
  syncFilterUI: () => void;
  dashboard: DashboardViewProvider;
  metricsView: MetricsViewProvider;
};

async function initializeDevOpsServices(context: vscode.ExtensionContext): Promise<DevOpsExtensionServices> {
  // Internal board state provider (data source)
  const provider = new BoardTreeProvider(readBoard);

  // Dashboard (handles onboarding and status display)
  const dashboard = new DashboardViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('devopsStatusBoard', dashboard)
  );

  const metricsView = new MetricsViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('devopsMetricsView', metricsView)
  );

  const boardPanelManager = createBoardPanelManager(context);

  // Create status bar
  const statusBar = createStatusBar(context);

  // Create filter synchronizer
  const syncFilterUI = () => {
    const active = provider.hasFilter();
    void vscode.commands.executeCommand('setContext', 'devopsFilterActive', active);
  };
  syncFilterUI();

  return {
    provider,
    boardView: undefined as unknown as vscode.TreeView<import('./views/board/BoardTreeProvider').BoardNode>,
    dashboard,
    metricsView,
    boardPanelManager,
    statusBar,
    syncFilterUI,
  };
}

function bindDevOpsViews(
  context: vscode.ExtensionContext,
  services: DevOpsExtensionServices,
): void {
  registerBoardSnapshotSync(context, services);
  registerBoardViewRequests(context, services);
}

function registerBoardSnapshotSync(context: vscode.ExtensionContext, services: DevOpsExtensionServices): void {
  const { provider, boardPanelManager, statusBar, dashboard, metricsView } = services;

  const updateAll = async () => {
    try {
      const board = await readBoard();
      statusBar.update(board);
      dashboard.refresh();
      metricsView.updateContent();
    } catch (e) { }
  };

  boardPanelManager.setBoard(provider.getBoardViewSnapshot());
  updateAll();

  context.subscriptions.push(
    provider.onDidUpdateBoardView((snapshot) => {
      boardPanelManager.setBoard(snapshot);
      updateAll();
    }),
  );
}

function registerBoardViewRequests(context: vscode.ExtensionContext, services: DevOpsExtensionServices): void {
  const { provider, boardPanelManager } = services;
  context.subscriptions.push(
    boardPanelManager.onDidRequestMoveTasks(async (request) => {
      await handleBoardMoveTasks(request, provider);
      if (request.taskIds?.length > 0) {
        await showPhaseNotification(request.taskIds[0], request.columnId);
      }
    }),
    boardPanelManager.onDidRequestOpenTask((taskId: string) => {
      void handleBoardOpenTask(taskId);
    }),
    boardPanelManager.onDidRequestCreateTask(() => {
      void Promise.resolve(vscode.commands.executeCommand('devops.createTask')).catch((error: unknown) => {
        vscode.window.showErrorMessage(`Unable to create task: ${formatError(error)}`);
      });
    }),
    boardPanelManager.onDidRequestArchiveTasks(async () => {
      await handleArchiveAll(provider);
    }),
    boardPanelManager.onDidRequestArchiveTask(async (taskId: string) => {
      await handleArchiveSingle(taskId, provider);
    }),
    boardPanelManager.onDidRequestDeleteTasks(async (taskIds: string[]) => {
      const count = taskIds.length;
      const confirmed = await vscode.window.showWarningMessage(
        `Delete ${count} task${count > 1 ? 's' : ''}?`,
        { modal: true },
        'Delete'
      );
      if (confirmed === 'Delete') {
        try {
          const board = await readBoard();
          board.items = board.items.filter(t => !taskIds.includes(t.id));
          await writeBoard(board);
          vscode.window.showInformationMessage(`Deleted ${count} task${count > 1 ? 's' : ''}`);
          vscode.commands.executeCommand('devops.refreshBoard');
        } catch (error: unknown) {
          vscode.window.showErrorMessage(`Unable to delete tasks: ${formatError(error)}`);
        }
      }
    }),
  );
}

/**
 * Detect if project is greenfield or brownfield based on existing files.
 * Greenfield: < 5 files, no manifest files
 * Brownfield: existing codebase
 */
async function detectProjectType(): Promise<'greenfield' | 'brownfield'> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return 'greenfield';
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const fs = require('fs');
  const path = require('path');

  // Check for common manifest files
  const manifestFiles = [
    'package.json',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'pom.xml',
    'build.gradle'
  ];

  for (const manifest of manifestFiles) {
    if (fs.existsSync(path.join(workspaceRoot, manifest))) {
      log(`Detected brownfield: found ${manifest}`);
      return 'brownfield';
    }
  }

  // Count files (excluding hidden dirs)
  try {
    const entries = fs.readdirSync(workspaceRoot);
    const visibleFiles = entries.filter((e: string) => !e.startsWith('.'));
    if (visibleFiles.length > 5) {
      log(`Detected brownfield: ${visibleFiles.length} files`);
      return 'brownfield';
    }
  } catch {
    // Ignore errors
  }

  log('Detected greenfield: new project');
  return 'greenfield';
}
