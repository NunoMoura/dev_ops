import * as assert from 'assert';
import { BoardService, BoardStore } from '../services/board/boardService';
import { Board, Task } from '../common';

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
                { id: 'col-done', name: 'Done', position: 2 }
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
            archiveTaskFile: async (id: string, content: string) => {
                const path = `/mock/archive/${id}.json`;
                archivedFiles.push(path);
                return path;
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

        await service.claimTask(id, { name: 'Test Agent', type: 'agent' });

        const task = mockBoard.items[0];
        assert.strictEqual(task.status, 'in_progress');
        assert.ok(task.owner);
        assert.strictEqual(task.owner.name, 'Test Agent');
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
        assert.strictEqual(task.status, 'todo');
        assert.strictEqual(task.columnId, 'col-done');
    });

    test('pickNextTask selects highest priority task from Backlog', async () => {
        await service.createTask({ title: 'Low Priority', columnId: 'col-backlog', priority: 'low' });
        const highId = await service.createTask({ title: 'High Priority', columnId: 'col-backlog', priority: 'high' });

        // Should pick the high priority one
        const pickedId = await service.pickNextTask();
        assert.strictEqual(pickedId, highId);
    });

    test('pickNextTask ignores tasks with owners', async () => {
        const id = await service.createTask({ title: 'Claimed Task', columnId: 'col-backlog', priority: 'high' });
        await service.claimTask(id);

        const pickedId = await service.pickNextTask();
        assert.strictEqual(pickedId, null);
    });
});
