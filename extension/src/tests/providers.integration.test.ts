import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { BoardTreeProvider, BoardColumnNode, BoardItemNode } from '../ui/board';
import { Board, Column, Task, DEFAULT_COLUMN_BLUEPRINTS } from '../common';

/**
 * Integration tests for View Providers.
 * These tests run within the VS Code test harness environment.
 */

// Helper to create a mock board for testing
function createMockBoard(options?: {
    columns?: Column[];
    items?: Task[];
}): Board {
    return {
        version: 1,
        columns: options?.columns ?? [
            { id: 'col-backlog', name: 'Backlog', position: 1 },
            { id: 'col-impl', name: 'Implementation', position: 2 },
            { id: 'col-done', name: 'Done', position: 3 },
        ],
        items: options?.items ?? [
            { id: 'TASK-001', columnId: 'col-backlog', title: 'First task', status: 'todo' },
            { id: 'TASK-002', columnId: 'col-impl', title: 'Second task', status: 'in_progress' },
            { id: 'TASK-003', columnId: 'col-done', title: 'Third task', status: 'done' },
        ],
    };
}

suite('BoardTreeProvider Integration Tests', () => {
    let provider: BoardTreeProvider;
    let mockBoard: Board;

    setup(() => {
        mockBoard = createMockBoard();
        // Create provider with a mock loadBoard function
        provider = new BoardTreeProvider(async () => mockBoard);
    });

    teardown(() => {
        sinon.restore();
    });

    test('getChildren returns columns at root level', async () => {
        const children = await provider.getChildren();
        assert.strictEqual(children.length, 3);
        assert.ok(children.every((c) => c.kind === 'column'));
    });

    test('getChildren returns tasks for a column', async () => {
        const columns = await provider.getChildren();
        const backlogColumn = columns.find(
            (c) => c.kind === 'column' && c.column.id === 'col-backlog'
        ) as BoardColumnNode;

        assert.ok(backlogColumn, 'Backlog column should exist');

        const tasks = await provider.getChildren(backlogColumn);
        assert.strictEqual(tasks.length, 1);
        assert.ok(tasks[0].kind === 'item');
        assert.strictEqual((tasks[0] as BoardItemNode).item.id, 'TASK-001');
    });

    test('getTreeItem returns correct label for column', async () => {
        const columns = await provider.getChildren();
        const column = columns[0] as BoardColumnNode;

        const treeItem = provider.getTreeItem(column);
        assert.strictEqual(treeItem.label, column.column.name);
        assert.strictEqual(treeItem.contextValue, 'devopsColumn');
    });

    test('getTreeItem returns correct label for task', async () => {
        const columns = await provider.getChildren();
        const backlogColumn = columns.find(
            (c) => c.kind === 'column' && c.column.id === 'col-backlog'
        ) as BoardColumnNode;
        const tasks = await provider.getChildren(backlogColumn);
        const task = tasks[0] as BoardItemNode;

        const treeItem = provider.getTreeItem(task);
        assert.strictEqual(treeItem.label, 'First task');
        assert.strictEqual(treeItem.contextValue, 'devopsTask');
    });

    test('getParent returns column for task', async () => {
        const columns = await provider.getChildren();
        const backlogColumn = columns.find(
            (c) => c.kind === 'column' && c.column.id === 'col-backlog'
        ) as BoardColumnNode;
        const tasks = await provider.getChildren(backlogColumn);
        const task = tasks[0] as BoardItemNode;

        const parent = provider.getParent(task);
        assert.ok(parent);
        assert.strictEqual(parent?.kind, 'column');
        assert.strictEqual((parent as BoardColumnNode).column.id, 'col-backlog');
    });

    test('getParent returns undefined for column', async () => {
        const columns = await provider.getChildren();
        const column = columns[0] as BoardColumnNode;

        const parent = provider.getParent(column);
        assert.strictEqual(parent, undefined);
    });

    test('hasFilter returns false initially', () => {
        assert.strictEqual(provider.hasFilter(), false);
    });

    test('setTextFilter applies filter and hasFilter returns true', async () => {
        await provider.setTextFilter('first');
        assert.strictEqual(provider.hasFilter(), true);
        assert.strictEqual(provider.getFilterText(), 'first');
    });

    test('clearFilters removes all filters', async () => {
        await provider.setTextFilter('first');
        assert.strictEqual(provider.hasFilter(), true);

        await provider.clearFilters();
        assert.strictEqual(provider.hasFilter(), false);
        assert.strictEqual(provider.getFilterText(), undefined);
    });

    test('toggleBlockedFilter toggles blocked status filter', async () => {
        assert.strictEqual(provider.isBlockedFilterEnabled(), false);

        await provider.toggleBlockedFilter();
        assert.strictEqual(provider.isBlockedFilterEnabled(), true);

        await provider.toggleBlockedFilter();
        assert.strictEqual(provider.isBlockedFilterEnabled(), false);
    });

    test('getBoardViewSnapshot returns correct structure', async () => {
        await provider.refresh();
        const snapshot = provider.getBoardViewSnapshot();

        assert.ok(snapshot);
        assert.strictEqual(snapshot!.columns.length, 3);
        assert.strictEqual(snapshot!.tasks.length, 3);

        const firstTask = snapshot!.tasks.find((t) => t.id === 'TASK-001');
        assert.ok(firstTask);
        assert.strictEqual(firstTask!.title, 'First task');
        assert.strictEqual(firstTask!.columnId, 'col-backlog');
    });

    test('getColumnNode returns correct node', async () => {
        await provider.refresh();
        const columnNode = provider.getColumnNode('col-impl');

        assert.ok(columnNode);
        assert.strictEqual(columnNode!.column.name, 'Implementation');
    });

    test('getColumnNode returns undefined for non-existent column', async () => {
        await provider.refresh();
        const columnNode = provider.getColumnNode('col-non-existent');

        assert.strictEqual(columnNode, undefined);
    });
});

suite('BoardTreeProvider - Empty Board', () => {
    test('getChildren returns empty array for empty board', async () => {
        const emptyBoard: Board = { version: 1, columns: [], items: [] };
        const provider = new BoardTreeProvider(async () => emptyBoard);

        const children = await provider.getChildren();
        assert.strictEqual(children.length, 0);
    });

    test('getBoardViewSnapshot returns empty arrays for empty board', async () => {
        const emptyBoard: Board = { version: 1, columns: [], items: [] };
        const provider = new BoardTreeProvider(async () => emptyBoard);
        await provider.refresh();

        const snapshot = provider.getBoardViewSnapshot();
        assert.ok(snapshot);
        assert.strictEqual(snapshot!.columns.length, 0);
        assert.strictEqual(snapshot!.tasks.length, 0);
    });
});

suite('BoardTreeProvider - Column Sorting', () => {
    test('columns are sorted by position', async () => {
        const board = createMockBoard({
            columns: [
                { id: 'col-3', name: 'Third', position: 3 },
                { id: 'col-1', name: 'First', position: 1 },
                { id: 'col-2', name: 'Second', position: 2 },
            ],
            items: [],
        });
        const provider = new BoardTreeProvider(async () => board);

        const children = await provider.getChildren();
        assert.strictEqual(children.length, 3);
        assert.strictEqual((children[0] as BoardColumnNode).column.name, 'First');
        assert.strictEqual((children[1] as BoardColumnNode).column.name, 'Second');
        assert.strictEqual((children[2] as BoardColumnNode).column.name, 'Third');
    });
});
