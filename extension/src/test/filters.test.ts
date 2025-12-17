import { strict as assert } from 'assert';
import { applyFilters, columnMatchesFilters, parseTaskFilter } from '../features/filters';
import { KanbanColumn, KanbanItem } from '../features/types';

suite('Task filters', () => {
  const column: KanbanColumn = { id: 'col-1', name: 'Implementation', position: 1 };
  const tasks: KanbanItem[] = [
    { id: '1', columnId: 'col-1', title: 'Ship auth', status: 'blocked', agentReady: true },
    { id: '2', columnId: 'col-1', title: 'Write docs', status: 'todo', agentReady: false },
    { id: '3', columnId: 'col-1', title: 'Tidy backlog', status: 'blocked', agentReady: false, tags: ['ops'] },
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
      onlyAgentReady: true,
      status: 'blocked' as const,
    };
    const result = applyFilters(tasks, column, filterState);
    assert.deepStrictEqual(
      result.map((t) => t.id),
      ['1'],
    );
  });

  test('columnMatchesFilters uses fallback titles when name missing', () => {
    const unnamedColumn: KanbanColumn = { id: 'col-2', name: '', position: 2 };
    const filterState = { text: parseTaskFilter('unassigned') };
    const matches = columnMatchesFilters(unnamedColumn, filterState);
    assert.strictEqual(matches, true);
  });
});
