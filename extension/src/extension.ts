import * as vscode from 'vscode';
import { KanbanBoardPanelManager, createBoardPanelManager } from './boardView';
import { KanbanTreeProvider, KanbanNode, KanbanItemNode, KanbanManagerProvider } from './ui/providers';
import {
  registerKanbanCommands,
  handleBoardMoveTasks,
  handleBoardOpenTask,
  handleCardUpdateMessage,
  handleCardDeleteMessage,
  KanbanCommandServices,
} from './commands';
import { registerInitializeCommand } from './commands/initializeCommand';
import { readKanban, registerKanbanWatchers } from './features/boardStore';
import { COLUMN_FALLBACK_NAME } from './features/types';
import { buildCardPayload } from './features/taskPresentation';
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

    const services = await initializeKanbanServices(context);
    const syncFilterUI = createFilterSynchronizer(services.provider, services.kanbanView);

    bindKanbanViews(context, services, syncFilterUI);

    try {
      await services.provider.refresh();
    } catch (error) {
      console.warn('Kanban board not loaded on activation:', error);
    }

    await registerKanbanWatchers(services.provider, context);
    registerKanbanCommands(context, services, syncFilterUI);

    console.log('DevOps extension activated successfully');
  } catch (error) {
    console.error('DevOps extension activation failed:', error);
    vscode.window.showErrorMessage(`DevOps extension failed to activate: ${formatError(error)}`);
  }
}

export function deactivate() { }

type KanbanExtensionServices = KanbanCommandServices & {
  boardPanelManager: KanbanBoardPanelManager;
  managerProvider: KanbanManagerProvider;
  statusBar: StatusBarManager;
};

async function initializeKanbanServices(context: vscode.ExtensionContext): Promise<KanbanExtensionServices> {
  const provider = new KanbanTreeProvider(readKanban);
  const kanbanView = vscode.window.createTreeView('kanbanView', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  context.subscriptions.push(kanbanView);

  const metricsProvider = registerMetricsView(context);
  const boardPanelManager = createBoardPanelManager(context);
  const managerProvider = new KanbanManagerProvider(provider);
  const managerDragController = managerProvider.getDragAndDropController();
  const kanbanManagerView = vscode.window.createTreeView('kanbanManagerView', {
    treeDataProvider: managerProvider,
    showCollapseAll: false,
    dragAndDropController: managerDragController,
  });
  context.subscriptions.push(kanbanManagerView, managerDragController);
  await managerProvider.refresh();

  // Create status bar
  const statusBar = createStatusBar(context);

  return { provider, kanbanView, metricsProvider, boardPanelManager, managerProvider, statusBar };
}

function createFilterSynchronizer(provider: KanbanTreeProvider, kanbanView: vscode.TreeView<KanbanNode>): () => void {
  const sync = () => {
    const summary = provider.getFilterSummary();
    const active = provider.hasFilter();
    kanbanView.message = active && summary ? `Filter: ${summary}` : undefined;
    void vscode.commands.executeCommand('setContext', 'kanbanFilterActive', active);
    void vscode.commands.executeCommand('setContext', 'kanbanFilterAgentReady', provider.isStatusFilterEnabled('blocked'));
    void vscode.commands.executeCommand('setContext', 'kanbanFilterBlocked', provider.isBlockedFilterEnabled());
  };
  sync();
  return sync;
}

function bindKanbanViews(
  context: vscode.ExtensionContext,
  services: KanbanExtensionServices,
  _syncFilterUI: () => void,
): void {
  // Tasks now open in editor tabs - no card selection sync needed
  registerBoardSnapshotSync(context, services);
  registerBoardViewRequests(context, services);

  // Auto-open board when clicking on sidebar icon
  const { kanbanView, boardPanelManager } = services;
  context.subscriptions.push(
    kanbanView.onDidChangeVisibility((e) => {
      if (e.visible) {
        boardPanelManager.openBoard();
      }
    })
  );
}

// Card selection now opens tasks in editor tabs - no sidebar sync needed

function registerBoardSnapshotSync(context: vscode.ExtensionContext, services: KanbanExtensionServices): void {
  const { provider, boardPanelManager, managerProvider, statusBar, metricsProvider } = services;
  boardPanelManager.setBoard(provider.getBoardViewSnapshot());

  // Update status bar and metrics with initial board state
  readKanban().then((board) => {
    statusBar.update(board);
    metricsProvider.updateBoard(board);
  }).catch(() => { });

  context.subscriptions.push(
    provider.onDidUpdateBoardView((snapshot) => {
      boardPanelManager.setBoard(snapshot);
      void managerProvider.refresh();
      // Update status bar and metrics when board changes
      readKanban().then((board) => {
        statusBar.update(board);
        metricsProvider.updateBoard(board);
      }).catch(() => { });
    }),
  );
}

function registerBoardViewRequests(context: vscode.ExtensionContext, services: KanbanExtensionServices): void {
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

// Card view handlers removed - tasks now edit via editor tabs with auto-save
