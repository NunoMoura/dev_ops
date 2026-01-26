import * as vscode from 'vscode';
import { DevOpsExtensionServices } from './services';
import { readBoard } from '../services/board/boardPersistence';
import {
    handleBoardMoveTasks,
    handleBoardOpenTask,
    handleArchiveAll,
    handleArchiveSingle,
    handleBoardDeleteTasks
} from './commands';
import { showPhaseNotification } from '../services/notifications';
import { formatError } from '../common';

export function bindDevOpsViews(
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
