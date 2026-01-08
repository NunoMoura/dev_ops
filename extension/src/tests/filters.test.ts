import { strict as assert } from 'assert';
import { applyFilters, columnMatchesFilters, parseTaskFilter } from '../features/filters';
import { Column, Task } from '../core';

suite('Task filters', () => {
  const column: Column = { id: 'col-1', name: 'Implementation', position: 1 };
  const tasks: Task[] = [
    { id: '1', columnId: 'col-blocked', title: 'Ship auth', status: 'blocked' },
    { id: '2', columnId: 'col-backlog', title: 'Write docs', status: 'ready' },
    { id: '3', columnId: 'col-blocked', title: 'Tidy backlog', status: 'ready', tags: ['ops'] },
  ];

  test('parseTaskFilter extracts text and tag tokens', () => {
    const filter = parseTaskFilter('blocked #ops tag:web');
    assert.ok(filter);
    assert.deepStrictEqual(filter?.tokens, [
      { type: 'text', value: 'blocked' },
      { type: 'tag', value: 'ops' },
      { type: 'tag', value: 'web' },
    ]);
  });

  test('applyFilters requires every flag to match', () => {
    const filterState = {
      text: parseTaskFilter('ship'),
      status: 'blocked' as const,
      columnId: 'col-blocked' as const,
    };
    const result = applyFilters(tasks, column, filterState);
    assert.deepStrictEqual(
      result.map((t) => t.id),
      ['1'],
    );
  });

  test('columnMatchesFilters uses fallback titles when name missing', () => {
    const unnamedColumn: Column = { id: 'col-2', name: '', position: 2 };
    const filterState = { text: parseTaskFilter('unassigned') };
    const matches = columnMatchesFilters(unnamedColumn, filterState);
    assert.strictEqual(matches, true);
  });
});
