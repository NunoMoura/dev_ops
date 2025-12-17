import * as vscode from 'vscode';
import { KanbanCardViewProvider, registerCardView } from './cardView';
import { KanbanBoardViewProvider, registerBoardView } from './boardView';
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
  boardViewProvider: KanbanBoardViewProvider;
  managerProvider: KanbanManagerProvider;
};

async function initializeKanbanServices(context: vscode.ExtensionContext): Promise<KanbanExtensionServices> {
  const provider = new KanbanTreeProvider(readKanban);
  const kanbanView = vscode.window.createTreeView('kanbanView', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  context.subscriptions.push(kanbanView);

  const cardViewProvider = registerCardView(context);
  const boardViewProvider = registerBoardView(context);
  const managerProvider = new KanbanManagerProvider(provider);
  const managerDragController = managerProvider.getDragAndDropController();
  const kanbanManagerView = vscode.window.createTreeView('kanbanManagerView', {
    treeDataProvider: managerProvider,
    showCollapseAll: false,
    dragAndDropController: managerDragController,
  });
  context.subscriptions.push(kanbanManagerView, managerDragController);
  await managerProvider.refresh();

  return { provider, kanbanView, cardViewProvider, boardViewProvider, managerProvider };
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
  const { kanbanView, cardViewProvider } = services;
  const syncCardViewWithSelection = (selection: readonly KanbanNode[]) => {
    const taskNode = selection.find((node): node is KanbanItemNode => node.kind === 'item');
    if (taskNode) {
      const columnName = taskNode.column.name || COLUMN_FALLBACK_NAME;
      cardViewProvider.showTask(buildCardPayload(taskNode.item, columnName));
      return;
    }
    if (!selection.length) {
      cardViewProvider.showTask(undefined);
    }
  };
  context.subscriptions.push(
    kanbanView.onDidChangeSelection((event) => {
      syncCardViewWithSelection(event.selection);
    }),
  );
  syncCardViewWithSelection(kanbanView.selection ?? []);
}

function registerBoardSnapshotSync(context: vscode.ExtensionContext, services: KanbanExtensionServices): void {
  const { provider, boardViewProvider, managerProvider } = services;
  boardViewProvider.setBoard(provider.getBoardViewSnapshot());
  context.subscriptions.push(
    provider.onDidUpdateBoardView((snapshot) => {
      boardViewProvider.setBoard(snapshot);
      void managerProvider.refresh();
    }),
  );
}

function registerBoardViewRequests(context: vscode.ExtensionContext, services: KanbanExtensionServices): void {
  const { provider, boardViewProvider, cardViewProvider } = services;
  context.subscriptions.push(
    boardViewProvider.onDidRequestMoveTasks((request) => {
      void handleBoardMoveTasks(request, provider);
    }),
    boardViewProvider.onDidRequestOpenTask((taskId) => {
      void handleBoardOpenTask(taskId, cardViewProvider);
    }),
    boardViewProvider.onDidRequestCreateTask(() => {
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
  const { provider, cardViewProvider } = services;
  context.subscriptions.push(
    cardViewProvider.onDidSubmitUpdate((update) => {
      void handleCardUpdateMessage(update, provider, cardViewProvider, syncFilterUI);
    }),
    cardViewProvider.onDidRequestDelete((taskId) => {
      void handleCardDeleteMessage(taskId, provider, cardViewProvider, syncFilterUI);
    }),
  );
}
