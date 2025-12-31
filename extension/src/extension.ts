import * as vscode from 'vscode';
import { KanbanBoardPanelManager, createBoardPanelManager } from './boardView';
import { BoardTreeProvider } from './providers/boardTreeProvider';
import {
  registerBoardCommands,
  handleBoardMoveTasks,
  handleBoardOpenTask,
  KanbanCommandServices,
} from './handlers';
import { registerInitializeCommand } from './handlers/initializeCommand';
import { readBoard, writeBoard, registerBoardWatchers } from './features/boardStore';
import { formatError } from './features/errors';
import { showPhaseNotification } from './features/phaseNotifications';
import { createStatusBar, StatusBarManager } from './statusBar';
import { TaskEditorProvider } from './taskEditorProvider';
import { DashboardViewProvider, registerDashboardView } from './dashboardView';
import { registerDocsView } from './providers/docsViewProvider';
import { registerUXView } from './providers/uxViewProvider';
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
  log('DevOps extension v0.0.1 (Debug) activating...');
  vscode.window.showInformationMessage('DevOps v0.0.1 (Debug) Activated 🚀');
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

    log('[Activation] Step 4: Binding views');
    bindDevOpsViews(context, services);
    log('[Activation] Step 4 complete');

    try {
      await services.provider.refresh();
    } catch (error) {
      warn(`Kanban board not loaded on activation: ${error}`);
    }

    await registerBoardWatchers(services.provider, context);
    registerBoardCommands(context, services, services.syncFilterUI);

    // Initialize Session Bridge
    const sessionBridge = new SessionBridge(context);
    sessionBridge.activate();

    // Initialize Cursor Bridge
    // Note: We don't have a command to trigger it yet, but it ensures the dir exists.
    // In future, we can add a context menu "Send to Cursor"
    const cursorBridge = new CursorBridge(context);
    cursorBridge.activate();

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
      await vscode.commands.executeCommand('devops.openBoard');
      log('Board automatically opened');
    } catch (error) {
      // Silently fail if board doesn't exist yet
      warn(`Board auto-open skipped: ${formatError(error)}`);
    }

    log('DevOps extension activated successfully');
  } catch (error) {
    logError('DevOps extension activation failed', error);
    vscode.window.showErrorMessage(`DevOps extension failed to activate: ${formatError(error)}`);
  }
}

export function deactivate() { }

type DevOpsExtensionServices = KanbanCommandServices & {
  boardPanelManager: KanbanBoardPanelManager;
  statusBar: StatusBarManager;
  syncFilterUI: () => void;
  dashboardProvider: DashboardViewProvider;
};

async function initializeDevOpsServices(context: vscode.ExtensionContext): Promise<DevOpsExtensionServices> {
  // Internal board state provider (not displayed as a tree anymore)
  const provider = new BoardTreeProvider(readBoard);

  // Register sidebar views
  // Register sidebar views
  const dashboardProvider = registerDashboardView(context);
  registerDocsView(context);
  registerUXView(context);

  const boardPanelManager = createBoardPanelManager(context);

  // Create status bar
  const statusBar = createStatusBar(context);

  // Create filter synchronizer
  const syncFilterUI = () => {
    const active = provider.hasFilter();
    void vscode.commands.executeCommand('setContext', 'kanbanFilterActive', active);
  };
  syncFilterUI();

  return {
    provider,
    kanbanView: undefined as unknown as vscode.TreeView<import('./providers/boardTreeProvider').BoardNode>,
    dashboardProvider,
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
  const { provider, boardPanelManager, statusBar, dashboardProvider } = services;
  boardPanelManager.setBoard(provider.getBoardViewSnapshot());

  // Update status bar and dashboard with initial board state
  readBoard().then((board) => {
    statusBar.update(board);
    dashboardProvider.updateBoard(board);
  }).catch(() => { });

  context.subscriptions.push(
    provider.onDidUpdateBoardView((snapshot) => {
      boardPanelManager.setBoard(snapshot);
      // Update status bar and dashboard when board changes
      readBoard().then((board) => {
        statusBar.update(board);
        dashboardProvider.updateBoard(board);
      }).catch(() => { });
    }),
  );
}

function registerBoardViewRequests(context: vscode.ExtensionContext, services: DevOpsExtensionServices): void {
  const { provider, boardPanelManager } = services;
  context.subscriptions.push(
    boardPanelManager.onDidRequestMoveTasks(async (request) => {
      await handleBoardMoveTasks(request, provider);
      // Show phase notification for the first moved task
      if (request.taskIds?.length > 0) {
        await showPhaseNotification(request.taskIds[0], request.columnId);
      }
    }),
    boardPanelManager.onDidRequestOpenTask((taskId: string) => {
      void handleBoardOpenTask(taskId);
    }),
    boardPanelManager.onDidRequestCreateTask(() => {
      void Promise.resolve(vscode.commands.executeCommand('kanban.createTask')).catch((error: unknown) => {
        vscode.window.showErrorMessage(`Unable to create task: ${formatError(error)}`);
      });
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
          vscode.commands.executeCommand('kanban.refresh');
        } catch (error: unknown) {
          vscode.window.showErrorMessage(`Unable to delete tasks: ${formatError(error)}`);
        }
      }
    }),
  );
}

