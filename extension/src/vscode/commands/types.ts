import type * as vscode from 'vscode';
import type { BoardTreeProvider, BoardNode } from '../../ui/board';

/**
 * Request to move tasks to a different column (from board webview)
 */
export type MoveTasksRequest = {
    taskIds: string[];
    columnId: string;
};

/**
 * Services available to command handlers
 */
export type DevOpsCommandServices = {
    provider: BoardTreeProvider;
    boardView: vscode.TreeView<BoardNode>;
    dashboard?: import('../../ui/dashboard').DashboardViewProvider;
    metricsView?: import('../../ui/metrics').MetricsViewProvider;
};
