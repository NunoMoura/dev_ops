import { strict as assert } from 'assert';
import {
  parsePlanJson,
  parsePlanMarkdown,
  findOrCreateColumn,
  mergeLists,
  ensureStringArray,
} from '../services/planning';
import { Board } from '../common';

suite('Plan import helpers', () => {
  test('parsePlanJson normalizes optional arrays and fields', () => {
    const rawPlan = JSON.stringify(
      {
        title: 'Demo Plan',
        defaultColumn: 'Implementation',
        defaultStatus: 'in_progress',
        entryPoints: ['global.ts'],
        risks: ['downtime'],
        tasks: [
          {
            title: 'Integrate API',
            summary: 'Wire the backend',
            tags: ['backend', ' api '],
            priority: 'P1',
            acceptanceCriteria: ['return JSON'],
            checklist: ['add tests'],
            status: 'in_progress',
          },
        ],
      },
      null,
      2,
    );
    const parsed = parsePlanJson(rawPlan, '/tmp/plan.json');
    assert.strictEqual(parsed.title, 'Demo Plan');
    assert.strictEqual(parsed.defaultColumn, 'Implementation');
    assert.strictEqual(parsed.globalEntryPoints?.[0], 'global.ts');
    assert.deepStrictEqual(parsed.tasks[0].tags, ['backend', 'api']);
    assert.strictEqual(parsed.tasks[0].status, 'in_progress');
    assert.strictEqual(parsed.tasks[0].checklist?.length, 1);
  });

  test('parsePlanMarkdown collects sections, bullets, and defaults', () => {
    const markdown = `
# Launch Plan
Default Column: Build
Default Status: todo

## Tasks
### Task: Build service
Summary: create api
Entry Points:
- src/service.ts
Acceptance Criteria:
- respond to ping
Checklist:
- add docs
Risks:
- slow rollout

### Task: Document feature
Status: in_progress

## Entry Points
- docs/index.md

## Risks
- outage
`;
    const parsed = parsePlanMarkdown(markdown, '/tmp/plan.md');
    assert.strictEqual(parsed.defaultColumn, 'Build');
    assert.strictEqual(parsed.globalEntryPoints?.[0], 'docs/index.md');
    assert.strictEqual(parsed.globalRisks?.[0], 'outage');
    const firstTask = parsed.tasks[0];
    assert.deepStrictEqual(firstTask.entryPoints, ['src/service.ts']);
    assert.deepStrictEqual(firstTask.acceptanceCriteria, ['respond to ping']);
    assert.deepStrictEqual(firstTask.checklist, ['add docs']);
    assert.strictEqual(firstTask.risks?.[0], 'slow rollout');
    const secondTask = parsed.tasks[1];
    assert.strictEqual(secondTask.status, 'in_progress');
  });

  test('findOrCreateColumn reuses existing columns ignoring case', () => {
    const board: Board = {
      version: 1,
      columns: [{ id: 'col-1', name: 'Build', position: 1 }],
      items: [],
    };
    const same = findOrCreateColumn(board, 'build');
    assert.strictEqual(same.id, 'col-1');
    const created = findOrCreateColumn(board, 'QA');
    assert.ok(created.id.startsWith('col-'));
    assert.strictEqual(board.columns.length, 2);
  });

  test('mergeLists deduplicates while keeping order', () => {
    const merged = mergeLists(['api', 'docs'], undefined, ['docs', 'qa']);
    assert.deepStrictEqual(merged, ['api', 'docs', 'qa']);
  });

  test('ensureStringArray parses delimited strings', () => {
    assert.deepStrictEqual(ensureStringArray('a, b; c'), ['a', 'b', 'c']);
    assert.strictEqual(ensureStringArray(undefined), undefined);
  });
});
