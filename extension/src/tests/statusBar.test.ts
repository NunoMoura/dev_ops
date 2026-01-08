import { strict as assert } from 'assert';
import { Board, Task } from '../core';

// Testing statusBar logic patterns
// The actual functions require VS Code APIs,
// so we test the pure logic patterns here.

suite('StatusBar - Board Statistics', () => {
    function calculateStats(board: Board): { total: number; inProgress: number; blocked: number } {
        const total = board.items.length;
        const inProgress = board.items.filter(
            (t) => t.columnId === 'col-inprogress' || t.columnId === 'col-build'
        ).length;
        const blocked = board.items.filter(
            (t) => t.status === 'blocked'
        ).length;
        return { total, inProgress, blocked };
    }

    test('returns zeros for empty board', () => {
        const board: Board = { version: 1, columns: [], items: [] };
        const stats = calculateStats(board);
        assert.strictEqual(stats.total, 0);
        assert.strictEqual(stats.inProgress, 0);
        assert.strictEqual(stats.blocked, 0);
    });

    test('counts total tasks', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: '1', columnId: 'col-backlog', title: 'A' },
                { id: '2', columnId: 'col-build', title: 'B' },
                { id: '3', columnId: 'col-done', title: 'C' },
            ],
        };
        const stats = calculateStats(board);
        assert.strictEqual(stats.total, 3);
    });

    test('counts in-progress tasks', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: '1', columnId: 'col-backlog', title: 'A' },
                { id: '2', columnId: 'col-build', title: 'B' },
                { id: '3', columnId: 'col-build', title: 'C' },
            ],
        };
        const stats = calculateStats(board);
        assert.strictEqual(stats.inProgress, 2);
    });

    test('counts blocked tasks', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: '1', columnId: 'col-backlog', title: 'A', status: 'blocked' },
                { id: '2', columnId: 'col-build', title: 'B', status: 'agent_active' },
                { id: '3', columnId: 'col-build', title: 'C', status: 'blocked' },
            ],
        };
        const stats = calculateStats(board);
        assert.strictEqual(stats.blocked, 2);
    });
});

suite('StatusBar - Text Formatting', () => {
    function formatStatusText(total: number, inProgress: number, blocked: number): string {
        if (total === 0) {
            return '$(project) Board: No tasks';
        } else if (blocked > 0) {
            return `$(project) ${total} tasks • ${inProgress} active • ${blocked} blocked`;
        } else {
            return `$(project) ${total} tasks • ${inProgress} active`;
        }
    }

    test('shows "No tasks" for empty board', () => {
        assert.strictEqual(formatStatusText(0, 0, 0), '$(project) Board: No tasks');
    });

    test('shows task count and active', () => {
        assert.strictEqual(formatStatusText(5, 2, 0), '$(project) 5 tasks • 2 active');
    });

    test('shows blocked count when present', () => {
        assert.strictEqual(formatStatusText(5, 2, 1), '$(project) 5 tasks • 2 active • 1 blocked');
    });
});
