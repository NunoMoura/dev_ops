
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import * as boardPersistence from '../services/board/boardPersistence';
import { Board, Task } from '../types';

suite('Reproduction: readBoard Sync Logic (Integration)', () => {
    let sandbox: sinon.SinonSandbox;
    let tmpDir: string;
    let boardPath: string;
    let tasksDir: string;

    const mockBoard: Board = {
        version: 1,
        columns: [
            { id: 'col-backlog', name: 'Backlog', position: 1, taskIds: ['T-1'] },
            { id: 'col-done', name: 'Done', position: 2, taskIds: [] }
        ],
        items: []
    };

    const mockTask1: Task = {
        id: 'T-1',
        title: 'Task 1',
        columnId: 'col-backlog',
        status: 'none',
        updatedAt: new Date().toISOString()
    };

    const mockTaskNew: Task = {
        id: 'T-New',
        title: 'New Task',
        columnId: 'col-backlog',
        status: 'none',
        updatedAt: new Date().toISOString()
    };

    setup(async () => {
        sandbox = sinon.createSandbox();

        // Create temp directory
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-repro-'));
        const devOpsDir = path.join(tmpDir, '.dev_ops');
        fs.mkdirSync(devOpsDir); // Create .dev_ops

        boardPath = path.join(devOpsDir, 'board.json');
        tasksDir = path.join(devOpsDir, 'tasks');

        // Stub vscode.workspace.workspaceFolders
        // We use .get() to mock the property access
        const folder = {
            uri: vscode.Uri.file(tmpDir),
            name: 'test-workspace',
            index: 0
        };
        sandbox.stub(vscode.workspace, 'workspaceFolders').get(() => [folder]);

        // Setup initial files
        fs.mkdirSync(tasksDir, { recursive: true });
        fs.writeFileSync(boardPath, JSON.stringify(mockBoard, null, 2));

        // Setup T-1
        const t1Dir = path.join(tasksDir, 'T-1');
        fs.mkdirSync(t1Dir, { recursive: true });
        fs.writeFileSync(path.join(t1Dir, 'task.json'), JSON.stringify(mockTask1, null, 2));
    });

    teardown(() => {
        sandbox.restore();
        // Clean up temp dir
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (e) {
            console.error('Failed to cleanup tmp dir:', e);
        }
    });

    test('readBoard prunes stale IDs and appends new task, then persists', async () => {
        // --- Step 1: Verify Initial State ---
        let board = await boardPersistence.readBoard();

        assert.strictEqual(board.items.length, 1);
        assert.strictEqual(board.items[0].id, 'T-1');
        assert.deepStrictEqual(board.columns.find(c => c.id === 'col-backlog')?.taskIds, ['T-1']);

        // --- Step 2: Delete T-1, Add T-New ---

        // Delete T-1
        fs.rmSync(path.join(tasksDir, 'T-1'), { recursive: true, force: true });

        // Create T-New
        const tNewDir = path.join(tasksDir, 'T-New');
        fs.mkdirSync(tNewDir, { recursive: true });
        fs.writeFileSync(path.join(tNewDir, 'task.json'), JSON.stringify(mockTaskNew, null, 2));

        // Note: board.json on disk still says T-1 exists!
        const diskBoardBefore = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
        assert.deepStrictEqual(diskBoardBefore.columns[0].taskIds, ['T-1'], 'Disk board.json should still have stale T-1');

        // --- Step 3: Call readBoard ---
        board = await boardPersistence.readBoard();

        // --- Verification ---

        // 1. In-memory results
        assert.strictEqual(board.items.length, 1, 'Should have 1 task (T-New)');
        assert.strictEqual(board.items[0].id, 'T-New', 'Task should be T-New');

        const backlog = board.columns.find(c => c.id === 'col-backlog');
        assert.deepStrictEqual(backlog?.taskIds, ['T-New'], 'T-1 should be pruned and T-New added');

        // 2. Persistence Verification
        const diskBoardAfter = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
        const diskBacklog = diskBoardAfter.columns.find((c: any) => c.id === 'col-backlog');

        assert.deepStrictEqual(diskBacklog.taskIds, ['T-New'], 'board.json should have been updated on disk');
    });
});
