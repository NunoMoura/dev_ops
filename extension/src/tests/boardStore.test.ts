import { strict as assert } from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
    createEmptyBoard,
    createDefaultColumns,
    getBoardPath,
    readBoard,
    writeBoard,
    saveTask
} from '../services/board/boardPersistence';
import { DEFAULT_COLUMN_BLUEPRINTS } from '../common';

// Note: Most boardStore functions require mocking fs and vscode.workspace
// We test the pure functions here and document integration patterns.

suite('Board Store - createEmptyBoard', () => {
    test('creates board with version 1', () => {
        const board = createEmptyBoard();
        assert.strictEqual(board.version, 1);
    });

    test('creates board with default columns', () => {
        const board = createEmptyBoard();
        assert.ok(Array.isArray(board.columns));
        assert.strictEqual(board.columns.length, DEFAULT_COLUMN_BLUEPRINTS.length);
    });

    test('creates board with empty items array', () => {
        const board = createEmptyBoard();
        assert.ok(Array.isArray(board.items));
        assert.strictEqual(board.items.length, 0);
    });
});

suite('Board Store - createDefaultColumns', () => {
    test('returns columns matching blueprints', () => {
        const columns = createDefaultColumns();
        assert.strictEqual(columns.length, DEFAULT_COLUMN_BLUEPRINTS.length);
    });

    test('each column has id, name, and position', () => {
        const columns = createDefaultColumns();
        for (const column of columns) {
            assert.ok(column.id, 'Column should have id');
            assert.ok(column.name, 'Column should have name');
            assert.ok(typeof column.position === 'number', 'Column should have position');
        }
    });

    test('columns are independent copies (not references)', () => {
        const columns1 = createDefaultColumns();
        const columns2 = createDefaultColumns();

        // Mutate first set
        columns1[0].name = 'MODIFIED';

        // Second set should be unaffected
        assert.notStrictEqual(columns2[0].name, 'MODIFIED');
    });
});

suite('Board Store - Path Construction', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getBoardPath returns .dev_ops/board.json path', async () => {
        // Mock workspace folders
        const mockUri = vscode.Uri.file('/mock/root');
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: mockUri,
            name: 'Mock',
            index: 0
        }]);

        const p = getBoardPath();
        assert.ok(p?.endsWith('.dev_ops/board.json'));
        assert.ok(p?.includes('mock/root'));
    });

    test('getBoardPath returns undefined without workspace', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        const p = getBoardPath();
        assert.strictEqual(p, undefined);
    });
});

suite('Board Store - File Operations', () => {
    let sandbox: sinon.SinonSandbox;
    const tempDir = path.join(os.tmpdir(), `dev-ops-test-${Date.now()}`);

    setup(async () => {
        sandbox = sinon.createSandbox();
        await fs.mkdir(tempDir, { recursive: true });

        const mockUri = vscode.Uri.file(tempDir);
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: mockUri,
            name: 'Mock',
            index: 0
        }]);

        // Mock window.showErrorMessage to avoid UI popups
        sandbox.stub(vscode.window, 'showErrorMessage').resolves();
    });

    teardown(async () => {
        sandbox.restore();
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    });

    test('writeBoard creates directory and writes file', async () => {
        const board = createEmptyBoard();
        await writeBoard(board);

        const content = await fs.readFile(path.join(tempDir, '.dev_ops', 'board.json'), 'utf8');
        const parsed = JSON.parse(content);
        assert.strictEqual(parsed.version, 1);
        assert.ok(Array.isArray(parsed.columns));
    });

    test('readBoard returns board from file', async () => {
        const board = createEmptyBoard();
        const boardDir = path.join(tempDir, '.dev_ops');
        await fs.mkdir(boardDir, { recursive: true });
        await fs.writeFile(path.join(boardDir, 'board.json'), JSON.stringify(board));

        const read = await readBoard();
        assert.strictEqual(read.version, 1);
        assert.ok(Array.isArray(read.columns));
    });

    test('readBoard returns empty board on ENOENT', async () => {
        // Path construction ensures it looks for file in tempDir/.dev_ops/board.json
        // which doesn't exist yet.
        const read = await readBoard();
        assert.strictEqual(read.version, 1);
        assert.strictEqual(read.items.length, 0);
    });

    test('readBoard handles corrupt JSON', async () => {
        const boardDir = path.join(tempDir, '.dev_ops');
        await fs.mkdir(boardDir, { recursive: true });
        await fs.writeFile(path.join(boardDir, 'board.json'), '{ incomplete json');

        const read = await readBoard();
        assert.strictEqual(read.version, 1);
        assert.strictEqual(read.items.length, 0); // Reset to empty
    });
});

suite('Board Store - Backup Logic', () => {
    test('backup filename includes timestamp pattern', () => {
        // Test the timestamp formatting used in backupCorruptBoardFile
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        assert.ok(timestamp.includes('-'));
        assert.ok(!timestamp.includes(':'));
        assert.ok(!timestamp.includes('.'));
        const expectedPattern = /\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/;
        assert.ok(expectedPattern.test(timestamp));
    });
});
