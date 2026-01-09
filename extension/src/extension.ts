import * as vscode from 'vscode';
import { BoardPanelManager, createBoardPanelManager } from './ui/board';
import { BoardTreeProvider } from './ui/board';
import {
  registerBoardCommands,
  handleBoardMoveTasks,
  handleBoardOpenTask,
  handleArchiveAll,
  handleArchiveSingle,
  handleBoardDeleteTasks,
  DevOpsCommandServices,
} from './vscode/commands';
import { registerInitializeCommand } from './vscode/commands/initializeCommand';
import { readBoard, writeBoard, registerBoardWatchers, isProjectInitialized } from './data';
import { formatError } from './core';
import { showPhaseNotification } from './domains/notifications';
import { createStatusBar, StatusBarManager } from './ui/statusBar';
import { TaskEditorProvider, registerTaskDetailsView, BoardTaskDetailsViewProvider } from './ui/tasks';
// NEW Providers
import { DashboardViewProvider } from './ui/dashboard';
import { MetricsViewProvider } from './ui/metrics';

import { SessionBridge } from './integrations/sessionBridge';
import { CursorBridge } from './integrations/cursorBridge';
import { AgentManager, registerAgentManager } from './domains/agents';
import { AntigravityAdapter } from './domains/agents';
import { CursorAdapter } from './domains/agents';
import { registerCodeLensProvider } from './ui/shared';
import { registerSCMDecorations } from './vscode/scm/scmDecorator';
import { registerTestController } from './vscode/testing/testController';
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

    // Listen for workspace folder changes and update framework
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
        log('Workspace folders changed, checking framework status...');
        // Re-check framework for each added folder
        for (const folder of event.added) {
          log(`New workspace folder detected: ${folder.uri.fsPath}`);
          await checkAndUpdateFramework(context);
        }
      })
    );

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
 * Check if existing project needs framework files update.
 * Checks both .dev_ops and .agent/.cursor directories.
 * Runs silently to ensure scripts, rules, workflows are present.
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

  // Detect IDE to check correct folder
  const agentDir = path.join(workspaceRoot, '.agent');
  const cursorDir = path.join(workspaceRoot, '.cursor');

  let needsUpdate = false;
  let reason = '';
  const missingItems: string[] = [];

  // Check 1: .dev_ops exists but scripts missing
  if (fs.existsSync(boardPath) && !fs.existsSync(scriptsDir)) {
    needsUpdate = true;
    missingItems.push('scripts');
    reason = 'missing .dev_ops/scripts';
  }

  // Check 2: .agent exists but rules or workflows missing
  if (fs.existsSync(agentDir)) {
    const rulesDir = path.join(agentDir, 'rules');
    const workflowsDir = path.join(agentDir, 'workflows');

    if (!fs.existsSync(rulesDir) || !fs.existsSync(workflowsDir)) {
      needsUpdate = true;
      if (!fs.existsSync(rulesDir)) { missingItems.push('rules'); }
      if (!fs.existsSync(workflowsDir)) { missingItems.push('workflows'); }
      reason = reason ? `${reason}, missing .agent/rules or .agent/workflows` : 'missing .agent/rules or .agent/workflows';
    } else {
      // Check if directories are empty
      const rulesEmpty = fs.readdirSync(rulesDir).length === 0;
      const workflowsEmpty = fs.readdirSync(workflowsDir).length === 0;

      if (rulesEmpty || workflowsEmpty) {
        needsUpdate = true;
        if (rulesEmpty) { missingItems.push('rules'); }
        if (workflowsEmpty) { missingItems.push('workflows'); }
        reason = reason ? `${reason}, empty .agent directories` : 'empty .agent directories';
      }
    }
  }

  // Check 3: .cursor exists but rules or commands missing
  if (fs.existsSync(cursorDir)) {
    const rulesDir = path.join(cursorDir, 'rules');
    const commandsDir = path.join(cursorDir, 'commands');

    if (!fs.existsSync(rulesDir) || !fs.existsSync(commandsDir)) {
      needsUpdate = true;
      if (!fs.existsSync(rulesDir)) { missingItems.push('rules'); }
      if (!fs.existsSync(commandsDir)) { missingItems.push('commands'); }
      reason = reason ? `${reason}, missing .cursor/rules or .cursor/commands` : 'missing .cursor/rules or .cursor/commands';
    } else {
      // Check if directories are empty
      const rulesEmpty = fs.readdirSync(rulesDir).length === 0;
      const commandsEmpty = fs.readdirSync(commandsDir).length === 0;

      if (rulesEmpty || commandsEmpty) {
        needsUpdate = true;
        if (rulesEmpty) { missingItems.push('rules'); }
        if (commandsEmpty) { missingItems.push('commands'); }
        reason = reason ? `${reason}, empty .cursor directories` : 'empty .cursor directories';
      }
    }
  }

  if (needsUpdate) {
    log(`Detected project needing framework update: ${reason}`);

    // Show user-friendly notification
    const missingItemsStr = missingItems.join(', ');
    vscode.window.showInformationMessage(
      `📦 DevOps: Updating framework files (missing: ${missingItemsStr})...`,
    );

    try {
      await vscode.commands.executeCommand('devops.initialize');
      log('Framework files updated successfully');

      // Success notification
      vscode.window.showInformationMessage(
        `✅ DevOps: Framework files updated successfully!`
      );
    } catch (error) {
      warn(`Framework update failed: ${formatError(error)}`);

      // Error notification with action
      vscode.window.showErrorMessage(
        `DevOps: Framework update failed. Try running "DevOps: Initialize" manually.`,
        'Open Output'
      ).then(selection => {
        if (selection === 'Open Output') {
          vscode.commands.executeCommand('workbench.action.output.toggleOutput');
        }
      });
    }
  } else {
    log('Framework files are up to date');
  }
}

export function deactivate() { }

type DevOpsExtensionServices = DevOpsCommandServices & {
  boardPanelManager: BoardPanelManager;
  statusBar: StatusBarManager;
  syncFilterUI: () => void;
  dashboard: DashboardViewProvider;
  metricsView: MetricsViewProvider;
  taskDetails: BoardTaskDetailsViewProvider;
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

  // Task Details View (Sidebar)
  const taskDetails = registerTaskDetailsView(context);
  context.subscriptions.push(
    taskDetails.onDidRequestClaim((taskId) => {
      vscode.commands.executeCommand('devops.claimTask', { id: taskId });
    }),
    taskDetails.onDidRequestDelete((taskId) => {
      vscode.commands.executeCommand('devops.deleteTask', { id: taskId });
    })
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
    boardView: undefined as unknown as vscode.TreeView<import('./ui/board').BoardNode>,
    dashboard,
    metricsView,
    taskDetails,
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
      await handleBoardDeleteTasks(taskIds, provider);
    }),
    // Sync view state with dashboard
    boardPanelManager.onDidViewStateChange((isOpen) => {
      services.dashboard.setBoardOpenState(isOpen);
    })
  );

  // Initialize state
  services.dashboard.setBoardOpenState(boardPanelManager.isPanelOpen());
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
