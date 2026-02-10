import { strict as assert } from 'assert';
import { Board, Task } from '../types';

// Testing metricsView logic patterns
// The actual provider requires VS Code webview APIs,
// so we test the pure logic patterns here.

interface StatusMetrics {
    statusCounts: { todo: number; in_progress: number; needs_feedback: number; blocked: number; done: number };
}

function calculateMetrics(board: Board | undefined): StatusMetrics {
    if (!board) {
        return {
            statusCounts: { todo: 0, in_progress: 0, needs_feedback: 0, blocked: 0, done: 0 },
        };
    }

    const items = board.items || [];
    const statusCounts = { todo: 0, in_progress: 0, needs_feedback: 0, blocked: 0, done: 0 };

    items.forEach((task) => {
        const status = task.status || 'todo';
        if (status in statusCounts) {
            statusCounts[status as keyof typeof statusCounts]++;
        }
    });

    return { statusCounts };
}

suite('MetricsView - calculateMetrics', () => {
    test('returns zeros for undefined board', () => {
        const metrics = calculateMetrics(undefined);
        assert.strictEqual(metrics.statusCounts.todo, 0);
        assert.strictEqual(metrics.statusCounts.in_progress, 0);
        assert.strictEqual(metrics.statusCounts.needs_feedback, 0);
        assert.strictEqual(metrics.statusCounts.blocked, 0);
        assert.strictEqual(metrics.statusCounts.done, 0);
    });

    test('returns zeros for empty board', () => {
        const board: Board = { version: 1, columns: [], items: [] };
        const metrics = calculateMetrics(board);
        assert.strictEqual(metrics.statusCounts.todo, 0);
    });

    test('counts todo tasks', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: '1', columnId: 'col-1', title: 'A', status: 'todo' },
                { id: '2', columnId: 'col-1', title: 'B', status: 'todo' },
            ],
        };
        const metrics = calculateMetrics(board);
        assert.strictEqual(metrics.statusCounts.todo, 2);
    });

    test('counts in_progress tasks', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: '1', columnId: 'col-1', title: 'A', status: 'in_progress' },
            ],
        };
        const metrics = calculateMetrics(board);
        assert.strictEqual(metrics.statusCounts.in_progress, 1);
    });

    test('counts blocked tasks', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: '1', columnId: 'col-1', title: 'A', status: 'blocked' },
                { id: '2', columnId: 'col-1', title: 'B', status: 'blocked' },
                { id: '3', columnId: 'col-1', title: 'C', status: 'blocked' },
            ],
        };
        const metrics = calculateMetrics(board);
        assert.strictEqual(metrics.statusCounts.blocked, 3);
    });

    test('defaults to todo for tasks without status', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: '1', columnId: 'col-1', title: 'A' },  // no status
                { id: '2', columnId: 'col-1', title: 'B' },  // no status
            ],
        };
        const metrics = calculateMetrics(board);
        assert.strictEqual(metrics.statusCounts.todo, 2);
    });

    test('counts mixed statuses', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: '1', columnId: 'col-1', title: 'A', status: 'todo' },
                { id: '2', columnId: 'col-1', title: 'B', status: 'in_progress' },
                { id: '3', columnId: 'col-1', title: 'C', status: 'needs_feedback' },
                { id: '4', columnId: 'col-1', title: 'D', status: 'blocked' },
                { id: '5', columnId: 'col-1', title: 'E', status: 'done' },
            ],
        };
        const metrics = calculateMetrics(board);
        assert.strictEqual(metrics.statusCounts.todo, 1);
        assert.strictEqual(metrics.statusCounts.in_progress, 1);
        assert.strictEqual(metrics.statusCounts.needs_feedback, 1);
        assert.strictEqual(metrics.statusCounts.blocked, 1);
        assert.strictEqual(metrics.statusCounts.done, 1);
    });

    // Note: The Task type enforces valid statuses at compile time,
    // so unknown statuses can only occur at runtime from external data.
    // The calculateMetrics function handles this gracefully at runtime.
});

suite('MetricsView - TaskDetailsPayload', () => {
    interface TaskDetailsPayload {
        id: string;
        title: string;
        summary?: string;
        tags?: string;
        priority?: string;
        columnId?: string;
        status?: string;
        column?: string;
        workflow?: string;

    }

    test('can construct minimal payload', () => {
        const payload: TaskDetailsPayload = {
            id: 'TASK-001',
            title: 'Test Task',
        };
        assert.strictEqual(payload.id, 'TASK-001');
        assert.strictEqual(payload.title, 'Test Task');
        assert.strictEqual(payload.summary, undefined);
    });

    test('can construct full payload', () => {
        const payload: TaskDetailsPayload = {
            id: 'TASK-001',
            title: 'Test Task',
            summary: 'Summary text',
            tags: 'tag1, tag2',
            priority: 'high',
            columnId: 'col-build',
            status: 'agent_active',
            column: 'Build',
            workflow: 'feature',
        };
        assert.strictEqual(payload.priority, 'high');
        assert.strictEqual(payload.column, 'Build');
    });
});

suite('MetricsView - WebviewMessage Types', () => {
    type WebviewMessage =
        | { type: 'update'; task: { id: string; title: string } }
        | { type: 'delete'; id: string }
        | { type: 'task'; task: { id: string; title: string } }
        | { type: 'empty' };

    test('update message structure', () => {
        const msg: WebviewMessage = { type: 'update', task: { id: 'TASK-001', title: 'Updated' } };
        assert.strictEqual(msg.type, 'update');
    });

    test('delete message structure', () => {
        const msg: WebviewMessage = { type: 'delete', id: 'TASK-001' };
        assert.strictEqual(msg.type, 'delete');
        assert.strictEqual(msg.id, 'TASK-001');
    });

    test('empty message structure', () => {
        const msg: WebviewMessage = { type: 'empty' };
        assert.strictEqual(msg.type, 'empty');
    });
});
