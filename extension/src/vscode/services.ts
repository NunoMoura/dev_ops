import * as vscode from 'vscode';
import { BoardPanelManager, createBoardPanelManager, BoardTreeProvider, BoardNode } from '../ui/board';
import { DashboardViewProvider } from '../ui/dashboard';
import { MetricsViewProvider } from '../ui/metrics';

import { StatusBarManager, createStatusBar } from '../ui/statusBar';
import { readBoard } from '../services/board/boardPersistence';
import { boardService } from '../services/board/boardService';
import { DevOpsCommandServices } from './commands';

export type DevOpsExtensionServices = DevOpsCommandServices & {
    boardPanelManager: BoardPanelManager;
    statusBar: StatusBarManager;
    syncFilterUI: () => void;
    dashboard: DashboardViewProvider;
    metricsView: MetricsViewProvider;

    // taskDetails removed
    // Included specifically for type compatibility in other modules if needed
    provider: BoardTreeProvider;
    boardView: vscode.TreeView<BoardNode>;
};

export async function initializeDevOpsServices(context: vscode.ExtensionContext): Promise<DevOpsExtensionServices> {
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

    // Task Details View (Sidebar) - REMOVED


    const boardPanelManager = createBoardPanelManager(context);

    // Create status bar
    const statusBar = createStatusBar(context);

    // Note: File watching for board.json is handled by registerBoardWatchers() in boardStore.ts
    // (called from extension.ts) with proper 200ms debouncing to prevent UI flicker.

    // Create filter synchronizer
    const syncFilterUI = () => {
        const active = provider.hasFilter();
        void vscode.commands.executeCommand('setContext', 'devopsFilterActive', active);
    };
    syncFilterUI();

    return {
        provider,
        boardView: undefined as unknown as vscode.TreeView<BoardNode>,
        dashboard,
        metricsView,
        boardPanelManager,
        statusBar,
        syncFilterUI,
    };
}
