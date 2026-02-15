import * as assert from 'assert';
import { BoardService, BoardStore } from '../services/board/boardService';
import { Board, Task } from '../types';

suite('BoardService', () => {
    let mockStore: BoardStore;
    let service: BoardService;
    let mockBoard: Board;

    setup(() => {
        // Reset mock board state before each test
        mockBoard = {
            version: 1,
            columns: [
                { id: 'col-backlog', name: 'Backlog', position: 1 },
                { id: 'col-understand', name: 'Understand', position: 2 },
                { id: 'col-done', name: 'Done', position: 3 }
            ],
            items: []
        };

        let currentTask: string | null = null;
        let archivedFiles: string[] = [];

        mockStore = {
            readBoard: async () => JSON.parse(JSON.stringify(mockBoard)),
            writeBoard: async (b: Board) => { mockBoard = b; },
            saveTask: async (t: Task) => {
                const index = mockBoard.items.findIndex(i => i.id === t.id);
                if (index >= 0) {
                    mockBoard.items[index] = t;
                } else {
                    mockBoard.items.push(t);
                }
            },
            getBoardPath: async () => 'mock/path',
            readCurrentTask: async () => currentTask,
            writeCurrentTask: async (id: string) => { currentTask = id; },
            clearCurrentTask: async () => { currentTask = null; },
            archiveTaskBundle: async (id: string) => {
                const path = `/mock/archive/${id}`;
                archivedFiles.push(path);
                return path;
            },
            deleteTask: async (id: string) => {
                mockBoard.items = mockBoard.items.filter(i => i.id !== id);
            }
        };

        service = new BoardService(mockStore);
    });

    test('createTask adds a task to the board', async () => {
        const id = await service.createTask({
            title: 'Test Task',
            columnId: 'col-backlog'
        });

        assert.ok(id.startsWith('TASK-'));
        assert.strictEqual(mockBoard.items.length, 1);
        assert.strictEqual(mockBoard.items[0].title, 'Test Task');
    });

    test('claimTask sets the owner and status', async () => {
        const id = await service.createTask({
            title: 'Task to Claim',
            columnId: 'col-backlog'
        });

        await service.claimTask(id, { driver: { agent: 'Test Agent', model: 'Test Model' } });

        const task = mockBoard.items[0];
        assert.strictEqual(task.status, 'in_progress');
        assert.ok(task.activeSession);
        assert.strictEqual(task.activeSession.agent, 'Test Agent');
        // Verify auto-promotion from Backlog to Understand
        assert.strictEqual(task.columnId, 'col-understand');
    });

    test('markDone updates status and moves to Done column', async () => {
        const id = await service.createTask({
            title: 'Task to Finish',
            columnId: 'col-backlog'
        });

        // Ensure it's not done initially
        assert.notStrictEqual(mockBoard.items[0].columnId, 'col-done');

        await service.markDone(id);

        const task = mockBoard.items[0];
        assert.strictEqual(task.status, 'done');
        assert.strictEqual(task.columnId, 'col-done');
    });

    test('pickNextTask selects first task from Backlog', async () => {
        const firstId = await service.createTask({ title: 'First Task', columnId: 'col-backlog' });
        await service.createTask({ title: 'Second Task', columnId: 'col-backlog' });

        // Should pick the first one
        const pickedId = await service.pickNextTask();
        assert.strictEqual(pickedId, firstId);
    });

    test('pickNextTask ignores tasks with owners', async () => {
        const id = await service.createTask({ title: 'Claimed Task', columnId: 'col-backlog' });
        await service.claimTask(id);

        const pickedId = await service.pickNextTask();
        // Since we claimed it, it has an activeSession, so pickNextTask should skip it (based on our boardService logic updates)
        assert.strictEqual(pickedId, null);
    });

    test('reorderTask preserves task status on cross-column move', async () => {
        // Add a plan column to enable cross-column reorder
        mockBoard.columns.push({ id: 'col-plan', name: 'Plan', position: 4 });

        const id = await service.createTask({
            title: 'In Progress Task',
            columnId: 'col-understand'
        });

        // Set task to in_progress
        await service.claimTask(id, { driver: { agent: 'Test Agent', model: 'Test Model' } });
        assert.strictEqual(mockBoard.items[0].status, 'in_progress');

        // Reorder to Plan column
        await service.reorderTask(id, 'col-plan', 0);

        const task = mockBoard.items[0];
        // Status should still be in_progress, not reset to 'pending'
        assert.strictEqual(task.status, 'in_progress');
        assert.strictEqual(task.columnId, 'col-plan');
    });

    test('claimTask does not change column for non-backlog tasks', async () => {
        // Add a plan column
        mockBoard.columns.push({ id: 'col-plan', name: 'Plan', position: 4 });

        const id = await service.createTask({
            title: 'Task in Plan',
            columnId: 'col-plan'
        });

        await service.claimTask(id, { driver: { agent: 'Test Agent', model: 'Test Model' } });

        const task = mockBoard.items[0];
        // Task should remain in Plan, not be auto-promoted to Understand
        assert.strictEqual(task.columnId, 'col-plan');
        assert.strictEqual(task.status, 'in_progress');
    });
});
