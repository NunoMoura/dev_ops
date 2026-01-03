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
import { StatusBoardProvider } from './providers/statusBoardProvider';
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

    // Check for initialization and prompt if needed
    const initialized = await isProjectInitialized();
    if (!initialized) {
      log('[Activation] Project not initialized - prompting user');
      services.statusBar.showUninitialized();

      // Prompt user to initialize (modal - won't auto-dismiss)
      const choice = await vscode.window.showInformationMessage(
        '👋 Welcome to DevOps Framework! This workspace is not set up yet. Would you like to initialize it now?',
        { modal: true },
        'Initialize Now',
        'Not Now'
      );

      if (choice === 'Initialize Now') {
        // Prompt for project type (also modal)
        const typeChoice = await vscode.window.showQuickPick([
          {
            label: '🌱 Greenfield',
            description: 'New project starting from scratch',
            detail: 'Loads 8 starter tasks: vision, architecture, tech stack, scaffolding',
            value: 'greenfield'
          },
          {
            label: '🏗️ Brownfield',
            description: 'Existing codebase',
            detail: 'Loads 10 audit tasks: architecture review, dependencies, technical debt',
            value: 'brownfield'
          }
        ], {
          placeHolder: 'What type of project is this?',
          title: 'DevOps Framework: Project Type',
          ignoreFocusOut: true  // Don't dismiss when clicking elsewhere
        });

        if (typeChoice) {
          await vscode.commands.executeCommand('devops.initialize', typeChoice.value);
          // Refresh views after initialization
          try {
            await services.provider.refresh();
            services.statusBoard.refresh();
            services.metricsView.updateContent();
          } catch (error) {
            warn(`Board refresh after initialization failed: ${error}`);
          }
        }
      }
    }

    log('[Activation] Step 4: Binding views');
    bindDevOpsViews(context, services);
    log('[Activation] Step 4 complete');

    try {
      await services.provider.refresh();
      services.statusBoard.refresh();
      services.metricsView.updateContent();
    } catch (error) {
      warn(`Board not loaded on activation: ${error}`);
    }

    await registerBoardWatchers(services.provider, context);
    // Also watch for updates to refresh status board and metrics
    context.subscriptions.push(
      services.provider.onDidUpdateBoardView(() => {
        services.statusBoard.refresh();
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
      if (initialized) {
        // Maybe don't auto-open board anymore since we have the sidebar?
        // Keeping it for now as per config check usually inside openBoard
        await vscode.commands.executeCommand('devops.openBoard');
        log('Board automatically opened');
      }
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
  statusBoard: StatusBoardProvider;
  metricsView: MetricsViewProvider;
};

async function initializeDevOpsServices(context: vscode.ExtensionContext): Promise<DevOpsExtensionServices> {
  // Internal board state provider (data source)
  const provider = new BoardTreeProvider(readBoard);

  // NEW Sidebar Providers
  const statusBoard = new StatusBoardProvider();
  vscode.window.registerTreeDataProvider('devopsStatusBoard', statusBoard);

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
    statusBoard,
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
  const { provider, boardPanelManager, statusBar, statusBoard, metricsView } = services;

  const updateAll = async () => {
    try {
      const board = await readBoard();
      statusBar.update(board);
      statusBoard.refresh();
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


