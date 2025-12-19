import * as vscode from 'vscode';
import { Board } from './features/types';

export interface StatusBarManager {
    update(board: Board): void;
    dispose(): void;
}

/**
 * Creates a status bar item showing Kanban task counts.
 * Clicking opens the board.
 */
export function createStatusBar(context: vscode.ExtensionContext): StatusBarManager {
    const item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    item.command = 'kanban.openBoard';
    item.tooltip = 'Open Kanban Board';
    item.text = '$(project) Kanban';
    item.show();
    context.subscriptions.push(item);

    return {
        update(board: Board) {
            const total = board.items.length;
            const inProgress = board.items.filter(
                (t) => t.columnId === 'col-inprogress'
            ).length;
            const blocked = board.items.filter(
                (t) => t.columnId === 'col-blocked'
            ).length;

            if (total === 0) {
                item.text = '$(project) Kanban: No tasks';
            } else if (blocked > 0) {
                item.text = `$(project) ${total} tasks • ${inProgress} active • ${blocked} blocked`;
            } else {
                item.text = `$(project) ${total} tasks • ${inProgress} active`;
            }
        },
        dispose() {
            item.dispose();
        },
    };
}
