import * as vscode from 'vscode';
import { BoardPanelManager, createBoardPanelManager } from './boardView';
import { BoardTreeProvider } from './providers/boardTreeProvider';
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
import { formatError } from './features/errors';
import { showPhaseNotification } from './features/phaseNotifications';
import { createStatusBar, StatusBarManager } from './statusBar';
import { TaskEditorProvider } from './taskEditorProvider';
// NEW Providers
import { DashboardViewProvider } from './providers/dashboardViewProvider';
import { MetricsViewProvider } from './providers/metricsViewProvider';

import { SessionBridge } from './features/sessionBridge';
import { CursorBridge } from './features/cursorBridge';
import { AgentManager, registerAgentManager } from './agents/AgentManager';
import { AntigravityAdapter } from './agents/AntigravityAdapter';
import { CursorAdapter } from './agents/CursorAdapter';
import { registerTaskProvider } from './providers/taskProvider';
import { registerCodeLensProvider } from './providers/codeLensProvider';
import { registerSCMDecorations } from './scm/scmDecorator';
import { registerTestController } from './testExplorer/testController';
import { log, warn, error as logError } from './features/logger';

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
    boardView: undefined as unknown as vscode.TreeView<import('./providers/boardTreeProvider').BoardNode>,
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

/**
 * Register the setDeveloperName command.
 * Called from StatusBoardProvider when user clicks "Set Your Name".
 */
export function registerSetDeveloperNameCommand(
  context: vscode.ExtensionContext,
  statusBoard: { refresh(): void }
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('devops.setDeveloperName', async () => {
      const developerName = await vscode.window.showInputBox({
        title: 'DevOps: Set Your Name',
        prompt: 'Your name for Git collaboration and team attribution',
        placeHolder: 'e.g., Nuno, Alice, Bob',
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Name is required to continue';
          }
          return null;
        }
      });

      if (developerName) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const fs = require('fs');
        const path = require('path');
        const devOpsDir = path.join(workspaceRoot, '.dev_ops');
        const configPath = path.join(devOpsDir, 'config.json');

        // Ensure .dev_ops directory exists
        if (!fs.existsSync(devOpsDir)) {
          fs.mkdirSync(devOpsDir, { recursive: true });
        }

        // Write config
        const config = { developer: { name: developerName.trim() } };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        log(`Developer name saved: ${developerName}`);

        vscode.window.showInformationMessage(
          `✅ Welcome, ${developerName}! Your DevOps workspace is ready.`
        );

        // Refresh sidebar to show normal content
        statusBoard.refresh();
      }
    })
  );
}
