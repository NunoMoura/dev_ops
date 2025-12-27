import * as vscode from 'vscode';
import { KanbanBoardPanelManager, createBoardPanelManager } from './boardView';
import { KanbanTreeProvider } from './ui/providers';
import {
  registerKanbanCommands,
  handleBoardMoveTasks,
  handleBoardOpenTask,
  KanbanCommandServices,
} from './commands';
import { registerInitializeCommand } from './commands/initializeCommand';
import { readKanban, writeKanban, registerKanbanWatchers } from './features/boardStore';
import { formatError } from './features/errors';
import { showPhaseNotification } from './features/phaseNotifications';
import { createStatusBar, StatusBarManager } from './statusBar';
import { TaskEditorProvider } from './taskEditorProvider';
import { MetricsViewProvider, registerMetricsView } from './metricsView';
import { registerDocsView } from './ui/docsViewProvider';
import { registerAgentView } from './ui/agentViewProvider';


export async function activate(context: vscode.ExtensionContext) {
  console.log('DevOps extension activating...');
  try {
    // Register DevOps: Initialize command first (always works)
    context.subscriptions.push(registerInitializeCommand(context));

    // Register task editor for opening tasks in tabs
    context.subscriptions.push(TaskEditorProvider.register(context));

    const services = await initializeDevOpsServices(context);

    bindDevOpsViews(context, services);

    try {
      await services.provider.refresh();
    } catch (error) {
      console.warn('Kanban board not loaded on activation:', error);
    }

    await registerKanbanWatchers(services.provider, context);
    registerKanbanCommands(context, services, services.syncFilterUI);

    console.log('DevOps extension activated successfully');
  } catch (error) {
    console.error('DevOps extension activation failed:', error);
    vscode.window.showErrorMessage(`DevOps extension failed to activate: ${formatError(error)}`);
  }
}

export function deactivate() { }

type DevOpsExtensionServices = KanbanCommandServices & {
  boardPanelManager: KanbanBoardPanelManager;
  statusBar: StatusBarManager;
  agentView: vscode.TreeView<unknown>;
  syncFilterUI: () => void;
};

async function initializeDevOpsServices(context: vscode.ExtensionContext): Promise<DevOpsExtensionServices> {
  // Internal board state provider (not displayed as a tree anymore)
  const provider = new KanbanTreeProvider(readKanban);

  // Register Agent view for sidebar
  const agentProvider = registerAgentView(context);
  const agentView = vscode.window.createTreeView('devopsAgentView', {
    treeDataProvider: agentProvider,
  });
  context.subscriptions.push(agentView);

  // Register metrics view, docs view, and board panel
  const metricsProvider = registerMetricsView(context);
  registerDocsView(context);
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
    kanbanView: agentView as unknown as vscode.TreeView<import('./ui/providers').KanbanNode>,
    metricsProvider,
    boardPanelManager,
    statusBar,
    agentView,
    syncFilterUI,
  };
}

function bindDevOpsViews(
  context: vscode.ExtensionContext,
  services: DevOpsExtensionServices,
): void {
  registerBoardSnapshotSync(context, services);
  registerBoardViewRequests(context, services);

  // Auto-open board when clicking on Agent section
  const { agentView, boardPanelManager } = services;
  context.subscriptions.push(
    agentView.onDidChangeVisibility((e) => {
      if (e.visible) {
        boardPanelManager.openBoard();
      }
    })
  );
}

function registerBoardSnapshotSync(context: vscode.ExtensionContext, services: DevOpsExtensionServices): void {
  const { provider, boardPanelManager, statusBar, metricsProvider } = services;
  boardPanelManager.setBoard(provider.getBoardViewSnapshot());

  // Update status bar and metrics with initial board state
  readKanban().then((board) => {
    statusBar.update(board);
    metricsProvider.updateBoard(board);
  }).catch(() => { });

  context.subscriptions.push(
    provider.onDidUpdateBoardView((snapshot) => {
      boardPanelManager.setBoard(snapshot);
      // Update status bar and metrics when board changes
      readKanban().then((board) => {
        statusBar.update(board);
        metricsProvider.updateBoard(board);
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
          const board = await readKanban();
          board.items = board.items.filter(t => !taskIds.includes(t.id));
          await writeKanban(board);
          vscode.window.showInformationMessage(`Deleted ${count} task${count > 1 ? 's' : ''}`);
          vscode.commands.executeCommand('kanban.refresh');
        } catch (error: unknown) {
          vscode.window.showErrorMessage(`Unable to delete tasks: ${formatError(error)}`);
        }
      }
    }),
  );
}

