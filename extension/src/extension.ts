import * as vscode from 'vscode';
import { KanbanBoardPanelManager, createBoardPanelManager } from './boardView';
import { KanbanTreeProvider } from './ui/providers';
import { TasksActionProvider } from './ui/actionProviders';
import {
  registerKanbanCommands,
  handleBoardMoveTasks,
  handleBoardOpenTask,
  KanbanCommandServices,
} from './commands';
import { registerInitializeCommand } from './commands/initializeCommand';
import { readKanban, registerKanbanWatchers } from './features/boardStore';
import { formatError } from './features/errors';
import { createStatusBar, StatusBarManager } from './statusBar';
import { TaskEditorProvider } from './taskEditorProvider';
import { MetricsViewProvider, registerMetricsView } from './metricsView';


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
  tasksProvider: TasksActionProvider;
  statusBar: StatusBarManager;
  tasksView: vscode.TreeView<unknown>;
  syncFilterUI: () => void;
};

async function initializeDevOpsServices(context: vscode.ExtensionContext): Promise<DevOpsExtensionServices> {
  // Internal board state provider (not displayed as a tree anymore)
  const provider = new KanbanTreeProvider(readKanban);

  // Tasks action provider for sidebar
  const tasksProvider = new TasksActionProvider();

  // Register tree view for Tasks section
  const tasksView = vscode.window.createTreeView('devopsTasksView', {
    treeDataProvider: tasksProvider,
  });
  context.subscriptions.push(tasksView);

  // Register metrics view and board panel
  const metricsProvider = registerMetricsView(context);
  const boardPanelManager = createBoardPanelManager(context);

  // Create status bar
  const statusBar = createStatusBar(context);

  // Create filter synchronizer (updates context and sidebar filter chips)
  const syncFilterUI = () => {
    const active = provider.hasFilter();
    const filterText = provider.getFilterText();
    tasksProvider.setActiveFilter(active ? filterText : undefined);
    void vscode.commands.executeCommand('setContext', 'kanbanFilterActive', active);
  };
  syncFilterUI();

  return {
    provider,
    kanbanView: tasksView as unknown as vscode.TreeView<import('./ui/providers').KanbanNode>,
    metricsProvider,
    boardPanelManager,
    tasksProvider,
    statusBar,
    tasksView,
    syncFilterUI,
  };
}

function bindDevOpsViews(
  context: vscode.ExtensionContext,
  services: DevOpsExtensionServices,
): void {
  registerBoardSnapshotSync(context, services);
  registerBoardViewRequests(context, services);

  // Auto-open board when clicking on Tasks section
  const { tasksView, boardPanelManager } = services;
  context.subscriptions.push(
    tasksView.onDidChangeVisibility((e) => {
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
    boardPanelManager.onDidRequestMoveTasks((request) => {
      void handleBoardMoveTasks(request, provider);
    }),
    boardPanelManager.onDidRequestOpenTask((taskId: string) => {
      void handleBoardOpenTask(taskId);
    }),
    boardPanelManager.onDidRequestCreateTask(() => {
      void Promise.resolve(vscode.commands.executeCommand('kanban.createTask')).catch((error: unknown) => {
        vscode.window.showErrorMessage(`Unable to create task: ${formatError(error)}`);
      });
    }),
  );
}

