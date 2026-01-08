import { strict as assert } from 'assert';
import {
    compareTasks,
    getColumnRank,
    getPriorityRank,
    getUpdatedAtRank,
    compareNumbers,
    sortColumnsForManager,
    getNextColumnPosition,
    parseTags,
    splitListValues,
    appendParagraph,
    parseBooleanFromString,
    createId,
    slugify,
    isDefined,
    createTaskId,
} from '../features/boardData';
import { Board, Column, Task } from '../core';

suite('boardData - getColumnRank', () => {
    test('returns 0 for col-build (active work)', () => {
        assert.strictEqual(getColumnRank('col-build'), 0);
    });

    test('returns 1 for col-verify', () => {
        assert.strictEqual(getColumnRank('col-verify'), 1);
    });

    test('returns 4 for col-backlog', () => {
        assert.strictEqual(getColumnRank('col-backlog'), 4);
    });

    test('returns 5 for col-done', () => {
        assert.strictEqual(getColumnRank('col-done'), 5);
    });

    test('returns 6 for unknown column', () => {
        assert.strictEqual(getColumnRank('col-unknown'), 6);
    });

    test('returns 6 for undefined', () => {
        assert.strictEqual(getColumnRank(undefined), 6);
    });
});

suite('boardData - getPriorityRank', () => {
    test('returns 0 for high priority', () => {
        assert.strictEqual(getPriorityRank('high'), 0);
    });

    test('returns 0 for p0', () => {
        assert.strictEqual(getPriorityRank('p0'), 0);
    });

    test('returns 0 for critical', () => {
        assert.strictEqual(getPriorityRank('critical'), 0);
    });

    test('returns 1 for medium', () => {
        assert.strictEqual(getPriorityRank('medium'), 1);
    });

    test('returns 1 for p1', () => {
        assert.strictEqual(getPriorityRank('p1'), 1);
    });

    test('returns 2 for low', () => {
        assert.strictEqual(getPriorityRank('low'), 2);
    });

    test('returns 3 for undefined', () => {
        assert.strictEqual(getPriorityRank(undefined), 3);
    });

    test('is case insensitive', () => {
        assert.strictEqual(getPriorityRank('HIGH'), 0);
        assert.strictEqual(getPriorityRank('Medium'), 1);
        assert.strictEqual(getPriorityRank('LOW'), 2);
    });
});

suite('boardData - getUpdatedAtRank', () => {
    test('returns MAX_SAFE_INTEGER for undefined', () => {
        assert.strictEqual(getUpdatedAtRank(undefined), Number.MAX_SAFE_INTEGER);
    });

    test('returns timestamp for valid date', () => {
        const date = '2024-01-15T10:30:00Z';
        const result = getUpdatedAtRank(date);
        assert.strictEqual(result, Date.parse(date));
    });

    test('returns MAX_SAFE_INTEGER for invalid date', () => {
        assert.strictEqual(getUpdatedAtRank('not-a-date'), Number.MAX_SAFE_INTEGER);
    });
});

suite('boardData - compareNumbers', () => {
    test('compares two numbers correctly', () => {
        assert.strictEqual(compareNumbers(1, 2), -1);
        assert.strictEqual(compareNumbers(5, 3), 2);
        assert.strictEqual(compareNumbers(3, 3), 0);
    });

    test('number comes before undefined', () => {
        assert.strictEqual(compareNumbers(1, undefined), -1);
    });

    test('undefined comes after number', () => {
        assert.strictEqual(compareNumbers(undefined, 1), 1);
    });

    test('two undefined values are equal', () => {
        assert.strictEqual(compareNumbers(undefined, undefined), 0);
    });
});

suite('boardData - sortColumnsForManager', () => {
    test('sorts by position ascending', () => {
        const columns: Column[] = [
            { id: 'c3', name: 'Third', position: 3 },
            { id: 'c1', name: 'First', position: 1 },
            { id: 'c2', name: 'Second', position: 2 },
        ];
        const sorted = sortColumnsForManager(columns);
        assert.strictEqual(sorted[0].name, 'First');
        assert.strictEqual(sorted[1].name, 'Second');
        assert.strictEqual(sorted[2].name, 'Third');
    });

    test('sorts by name when positions are equal', () => {
        const columns: Column[] = [
            { id: 'c2', name: 'Zebra', position: 1 },
            { id: 'c1', name: 'Apple', position: 1 },
        ];
        const sorted = sortColumnsForManager(columns);
        assert.strictEqual(sorted[0].name, 'Apple');
        assert.strictEqual(sorted[1].name, 'Zebra');
    });

    test('does not mutate original array', () => {
        const columns: Column[] = [
            { id: 'c2', name: 'B', position: 2 },
            { id: 'c1', name: 'A', position: 1 },
        ];
        sortColumnsForManager(columns);
        assert.strictEqual(columns[0].name, 'B');
    });
});

suite('boardData - getNextColumnPosition', () => {
    test('returns 1 for empty array', () => {
        assert.strictEqual(getNextColumnPosition([]), 1);
    });

    test('returns max position + 1', () => {
        const columns: Column[] = [
            { id: 'c1', name: 'A', position: 1 },
            { id: 'c2', name: 'B', position: 5 },
            { id: 'c3', name: 'C', position: 3 },
        ];
        assert.strictEqual(getNextColumnPosition(columns), 6);
    });
});

suite('boardData - parseTags', () => {
    test('returns undefined for empty input', () => {
        assert.strictEqual(parseTags(''), undefined);
        assert.strictEqual(parseTags(undefined), undefined);
    });

    test('splits by spaces', () => {
        assert.deepStrictEqual(parseTags('tag1 tag2 tag3'), ['tag1', 'tag2', 'tag3']);
    });

    test('splits by commas', () => {
        assert.deepStrictEqual(parseTags('tag1,tag2,tag3'), ['tag1', 'tag2', 'tag3']);
    });

    test('handles mixed separators', () => {
        assert.deepStrictEqual(parseTags('tag1, tag2 tag3'), ['tag1', 'tag2', 'tag3']);
    });

    test('trims whitespace', () => {
        assert.deepStrictEqual(parseTags('  tag1  ,  tag2  '), ['tag1', 'tag2']);
    });
});

suite('boardData - splitListValues', () => {
    test('returns undefined for empty input', () => {
        assert.strictEqual(splitListValues(''), undefined);
        assert.strictEqual(splitListValues(undefined), undefined);
    });

    test('splits by commas', () => {
        assert.deepStrictEqual(splitListValues('a,b,c'), ['a', 'b', 'c']);
    });

    test('splits by semicolons', () => {
        assert.deepStrictEqual(splitListValues('a;b;c'), ['a', 'b', 'c']);
    });

    test('trims values', () => {
        assert.deepStrictEqual(splitListValues('a , b ; c'), ['a', 'b', 'c']);
    });
});

suite('boardData - appendParagraph', () => {
    test('returns addition when current is undefined', () => {
        assert.strictEqual(appendParagraph(undefined, 'new text'), 'new text');
    });

    test('appends with newline', () => {
        assert.strictEqual(appendParagraph('existing', 'new'), 'existing\nnew');
    });
});

suite('boardData - parseBooleanFromString', () => {
    test('returns true for truthy strings', () => {
        assert.strictEqual(parseBooleanFromString('true'), true);
        assert.strictEqual(parseBooleanFromString('yes'), true);
        assert.strictEqual(parseBooleanFromString('y'), true);
        assert.strictEqual(parseBooleanFromString('1'), true);
    });

    test('returns false for other strings', () => {
        assert.strictEqual(parseBooleanFromString('false'), false);
        assert.strictEqual(parseBooleanFromString('no'), false);
        assert.strictEqual(parseBooleanFromString('0'), false);
        assert.strictEqual(parseBooleanFromString(''), false);
    });

    test('is case insensitive', () => {
        assert.strictEqual(parseBooleanFromString('TRUE'), true);
        assert.strictEqual(parseBooleanFromString('Yes'), true);
    });
});

suite('boardData - slugify', () => {
    test('converts to lowercase', () => {
        assert.strictEqual(slugify('Hello World'), 'hello-world');
    });

    test('replaces spaces with hyphens', () => {
        assert.strictEqual(slugify('hello world'), 'hello-world');
    });

    test('removes special characters', () => {
        assert.strictEqual(slugify('hello@world!'), 'hello-world');
    });

    test('removes leading/trailing hyphens', () => {
        assert.strictEqual(slugify('--hello--'), 'hello');
    });

    test('truncates to 24 characters', () => {
        const long = 'this is a very long string that exceeds the limit';
        assert.ok(slugify(long).length <= 24);
    });
});

suite('boardData - isDefined', () => {
    test('returns true for defined values', () => {
        assert.strictEqual(isDefined('hello'), true);
        assert.strictEqual(isDefined(0), true);
        assert.strictEqual(isDefined(false), true);
        assert.strictEqual(isDefined(''), true);
    });

    test('returns false for undefined', () => {
        assert.strictEqual(isDefined(undefined), false);
    });

    test('returns false for null', () => {
        assert.strictEqual(isDefined(null), false);
    });
});

suite('boardData - createId', () => {
    test('creates id with prefix', () => {
        const id = createId('col');
        assert.ok(id.startsWith('col-'));
    });

    test('includes slugified seed', () => {
        const id = createId('task', 'My Task');
        assert.ok(id.includes('my-task'));
    });

    test('generates unique ids', () => {
        const id1 = createId('test');
        const id2 = createId('test');
        assert.notStrictEqual(id1, id2);
    });
});

suite('boardData - createTaskId', () => {
    test('creates TASK-001 for empty board', () => {
        const board: Board = { version: 1, columns: [], items: [] };
        assert.strictEqual(createTaskId(board), 'TASK-001');
    });

    test('finds next available ID', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: 'TASK-001', columnId: 'col-1', title: 'First' },
                { id: 'TASK-002', columnId: 'col-1', title: 'Second' },
            ],
        };
        assert.strictEqual(createTaskId(board), 'TASK-003');
    });

    test('fills gaps in IDs', () => {
        const board: Board = {
            version: 1,
            columns: [],
            items: [
                { id: 'TASK-001', columnId: 'col-1', title: 'First' },
                { id: 'TASK-003', columnId: 'col-1', title: 'Third' },
            ],
        };
        assert.strictEqual(createTaskId(board), 'TASK-002');
    });
});

suite('boardData - compareTasks', () => {
    test('sorts by column rank first', () => {
        const taskA: Task = { id: '1', columnId: 'col-backlog', title: 'A' };
        const taskB: Task = { id: '2', columnId: 'col-build', title: 'B' };
        assert.ok(compareTasks(taskA, taskB) > 0); // backlog comes after build
    });

    test('sorts by priority when columns equal', () => {
        const taskA: Task = { id: '1', columnId: 'col-build', title: 'A', priority: 'low' };
        const taskB: Task = { id: '2', columnId: 'col-build', title: 'B', priority: 'high' };
        assert.ok(compareTasks(taskA, taskB) > 0); // low priority comes after high
    });

    test('sorts by updatedAt when column and priority equal', () => {
        const taskA: Task = { id: '1', columnId: 'col-build', title: 'A', priority: 'high', updatedAt: '2024-01-02' };
        const taskB: Task = { id: '2', columnId: 'col-build', title: 'B', priority: 'high', updatedAt: '2024-01-01' };
        assert.ok(compareTasks(taskA, taskB) > 0); // newer comes after older
    });
});
