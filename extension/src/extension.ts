import * as vscode from 'vscode';
import { KanbanTaskDetailsViewProvider, registerTaskDetailsView } from './taskDetailsView';
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

export async function activate(context: vscode.ExtensionContext) {
  // Register DevOps: Initialize command
  context.subscriptions.push(registerInitializeCommand(context));

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
}

export function deactivate() { }

type KanbanExtensionServices = KanbanCommandServices & {
  boardPanelManager: KanbanBoardPanelManager;
  managerProvider: KanbanManagerProvider;
};

async function initializeKanbanServices(context: vscode.ExtensionContext): Promise<KanbanExtensionServices> {
  const provider = new KanbanTreeProvider(readKanban);
  const kanbanView = vscode.window.createTreeView('kanbanView', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  context.subscriptions.push(kanbanView);

  const taskDetailsProvider = registerTaskDetailsView(context);
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

  return { provider, kanbanView, taskDetailsProvider, boardPanelManager, managerProvider };
}

function createFilterSynchronizer(provider: KanbanTreeProvider, kanbanView: vscode.TreeView<KanbanNode>): () => void {
  const sync = () => {
    const summary = provider.getFilterSummary();
    const active = provider.hasFilter();
    kanbanView.message = active && summary ? `Filter: ${summary}` : undefined;
    void vscode.commands.executeCommand('setContext', 'kanbanFilterActive', active);
    void vscode.commands.executeCommand('setContext', 'kanbanFilterAgentReady', provider.isAgentReadyFilterEnabled());
    void vscode.commands.executeCommand('setContext', 'kanbanFilterBlocked', provider.isBlockedFilterEnabled());
  };
  sync();
  return sync;
}

function bindKanbanViews(
  context: vscode.ExtensionContext,
  services: KanbanExtensionServices,
  syncFilterUI: () => void,
): void {
  registerCardSelectionSync(context, services);
  registerBoardSnapshotSync(context, services);
  registerBoardViewRequests(context, services);
  registerCardViewHandlers(context, services, syncFilterUI);
}

function registerCardSelectionSync(context: vscode.ExtensionContext, services: KanbanExtensionServices): void {
  const { kanbanView, taskDetailsProvider } = services;
  const syncTaskDetailsWithSelection = (selection: readonly KanbanNode[]) => {
    const taskNode = selection.find((node): node is KanbanItemNode => node.kind === 'item');
    if (taskNode) {
      const columnName = taskNode.column.name || COLUMN_FALLBACK_NAME;
      taskDetailsProvider.showTask(buildCardPayload(taskNode.item, columnName));
      return;
    }
    if (!selection.length) {
      taskDetailsProvider.showTask(undefined);
    }
  };
  context.subscriptions.push(
    kanbanView.onDidChangeSelection((event) => {
      syncTaskDetailsWithSelection(event.selection);
    }),
  );
  syncTaskDetailsWithSelection(kanbanView.selection ?? []);
}

function registerBoardSnapshotSync(context: vscode.ExtensionContext, services: KanbanExtensionServices): void {
  const { provider, boardPanelManager, managerProvider } = services;
  boardPanelManager.setBoard(provider.getBoardViewSnapshot());
  context.subscriptions.push(
    provider.onDidUpdateBoardView((snapshot) => {
      boardPanelManager.setBoard(snapshot);
      void managerProvider.refresh();
    }),
  );
}

function registerBoardViewRequests(context: vscode.ExtensionContext, services: KanbanExtensionServices): void {
  const { provider, boardPanelManager, taskDetailsProvider } = services;
  context.subscriptions.push(
    boardPanelManager.onDidRequestMoveTasks((request) => {
      void handleBoardMoveTasks(request, provider);
    }),
    boardPanelManager.onDidRequestOpenTask((taskId) => {
      void handleBoardOpenTask(taskId, taskDetailsProvider);
    }),
    boardPanelManager.onDidRequestCreateTask(() => {
      void Promise.resolve(vscode.commands.executeCommand('kanban.createTask')).catch((error: unknown) => {
        vscode.window.showErrorMessage(`Unable to create feature: ${formatError(error)}`);
      });
    }),
  );
}

function registerCardViewHandlers(
  context: vscode.ExtensionContext,
  services: KanbanExtensionServices,
  syncFilterUI: () => void,
): void {
  const { provider, taskDetailsProvider } = services;
  context.subscriptions.push(
    taskDetailsProvider.onDidSubmitUpdate((update) => {
      void handleCardUpdateMessage(update, provider, taskDetailsProvider, syncFilterUI);
    }),
    taskDetailsProvider.onDidRequestDelete((taskId) => {
      void handleCardDeleteMessage(taskId, provider, taskDetailsProvider, syncFilterUI);
    }),
  );
}
