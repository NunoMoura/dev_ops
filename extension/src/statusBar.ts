import * as vscode from 'vscode';
import { Board } from './features/types';

export interface StatusBarManager {
    update(board: Board): void;
    showUninitialized(): void;
    dispose(): void;
}

/**
 * Creates a status bar item showing Board task counts.
 * Clicking opens the board.
 */
export function createStatusBar(context: vscode.ExtensionContext): StatusBarManager {
    const item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    item.command = 'devops.openBoard';
    item.tooltip = 'Open Board Board';
    item.text = '$(project) Board';
    item.show();
    context.subscriptions.push(item);

    return {
        update(board: Board) {
            const total = board.items.length;
            const activeStatuses = ['ready', 'agent_active', 'needs_feedback'];
            const active = board.items.filter(
                (t) => activeStatuses.includes(t.status || '') && t.columnId !== 'col-done'
            ).length;
            const blocked = board.items.filter(
                (t) => t.status === 'blocked'
            ).length;

            if (total === 0) {
                item.text = '$(project) Board: No tasks';
            } else if (blocked > 0) {
                item.text = `$(project) ${total} tasks • ${active} active • ${blocked} blocked`;
            } else {
                item.text = `$(project) ${total} tasks • ${active} active`;
            }
            item.command = 'devops.openBoard';
            item.backgroundColor = undefined;
        },
        showUninitialized() {
            item.text = '$(warning) Initialize DevOps';
            item.command = 'devops.initialize';
            item.tooltip = 'Click to initialize DevOps framework in this workspace';
            item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            item.show();
        },
        dispose() {
            item.dispose();
        },
    };
}
