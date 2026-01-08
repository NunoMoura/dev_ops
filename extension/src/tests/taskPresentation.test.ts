import { strict as assert } from 'assert';
import {
    buildTaskDescription,
    buildTaskTooltip,
    buildTaskDetail,
    buildCardPayload,
    buildCodexPrompt,
} from '../domains/tasks';
import { Task } from '../core';

// Helper to create a minimal task
function createTask(overrides?: Partial<Task>): Task {
    return {
        id: 'TASK-001',
        columnId: 'col-backlog',
        title: 'Test Task',
        ...overrides,
    };
}

suite('taskPresentation - buildTaskDescription', () => {
    test('returns undefined for minimal task', () => {
        const task = createTask();
        // columnId is included, so description won't be undefined
        const desc = buildTaskDescription(task);
        assert.ok(desc?.includes('col-backlog'));
    });

    test('includes priority when set', () => {
        const task = createTask({ priority: 'high' });
        const desc = buildTaskDescription(task);
        assert.ok(desc?.includes('high'));
    });

    test('includes status when set', () => {
        const task = createTask({ status: 'blocked' });
        const desc = buildTaskDescription(task);
        assert.ok(desc?.includes('status:blocked'));
    });

    test('includes tags when set', () => {
        const task = createTask({ tags: ['frontend', 'urgent'] });
        const desc = buildTaskDescription(task);
        assert.ok(desc?.includes('frontend'));
        assert.ok(desc?.includes('urgent'));
    });

    test('joins parts with bullet separator', () => {
        const task = createTask({ priority: 'high', status: 'ready' });
        const desc = buildTaskDescription(task);
        assert.ok(desc?.includes(' • '));
    });
});

suite('taskPresentation - buildTaskTooltip', () => {
    test('includes task title as header', () => {
        const task = createTask({ title: 'My Task' });
        const tooltip = buildTaskTooltip(task, 'Backlog');
        assert.ok(tooltip.includes('**My Task**'));
    });

    test('includes column name', () => {
        const task = createTask();
        const tooltip = buildTaskTooltip(task, 'Implementation');
        assert.ok(tooltip.includes('Column: Implementation'));
    });

    test('includes summary when set', () => {
        const task = createTask({ summary: 'This is a test summary' });
        const tooltip = buildTaskTooltip(task, 'Backlog');
        assert.ok(tooltip.includes('Summary: This is a test summary'));
    });

    test('includes workflow when set', () => {
        const task = createTask({ workflow: 'feature' });
        const tooltip = buildTaskTooltip(task, 'Backlog');
        assert.ok(tooltip.includes('Workflow: feature'));
    });

    test('shows upstream count when set', () => {
        const task = createTask({ upstream: ['TASK-002', 'TASK-003'] });
        const tooltip = buildTaskTooltip(task, 'Backlog');
        assert.ok(tooltip.includes('Upstream: 2'));
    });
});

suite('taskPresentation - buildTaskDetail', () => {
    test('includes column and priority', () => {
        const task = createTask({ priority: 'medium' });
        const detail = buildTaskDetail(task, 'Planning');
        assert.ok(detail.includes('Column: Planning'));
        assert.ok(detail.includes('Priority: medium'));
    });

    test('includes acceptance criteria when set', () => {
        const task = createTask({ acceptanceCriteria: ['Must pass tests', 'Must be documented'] });
        const detail = buildTaskDetail(task, 'Build');
        assert.ok(detail.includes('Acceptance Criteria:'));
        assert.ok(detail.includes('- Must pass tests'));
        assert.ok(detail.includes('- Must be documented'));
    });

    test('includes checklist when set', () => {
        const task = createTask({ checklist: [{ text: 'Write code', done: false }, { text: 'Add tests', done: false }] });
        const detail = buildTaskDetail(task, 'Build');
        assert.ok(detail.includes('Checklist:'));
        assert.ok(detail.includes('- [ ] Write code'));
    });

    test('includes upstream/downstream', () => {
        const task = createTask({
            upstream: ['TASK-002'],
            downstream: ['TASK-004', 'TASK-005'],
        });
        const detail = buildTaskDetail(task, 'Build');
        assert.ok(detail.includes('Upstream: TASK-002'));
        assert.ok(detail.includes('Downstream: TASK-004, TASK-005'));
    });

    test('includes risks when set', () => {
        const task = createTask({ risks: ['May cause downtime'] });
        const detail = buildTaskDetail(task, 'Build');
        assert.ok(detail.includes('Risks:'));
        assert.ok(detail.includes('- May cause downtime'));
    });
});

suite('taskPresentation - buildCardPayload', () => {
    test('returns correct payload structure', () => {
        const task = createTask({
            title: 'Card Task',
            summary: 'Summary text',
            tags: ['tag1', 'tag2'],
            priority: 'high',
            status: 'agent_active',
            workflow: 'feature',
            upstream: ['TASK-000'],
            downstream: ['TASK-999'],
        });

        const payload = buildCardPayload(task, 'Implementation');

        assert.strictEqual(payload.id, 'TASK-001');
        assert.strictEqual(payload.title, 'Card Task');
        assert.strictEqual(payload.summary, 'Summary text');
        assert.strictEqual(payload.tags, 'tag1, tag2');
        assert.strictEqual(payload.priority, 'high');
        assert.strictEqual(payload.status, 'agent_active');
        assert.strictEqual(payload.column, 'Implementation');
        assert.strictEqual(payload.workflow, 'feature');
        assert.deepStrictEqual(payload.upstream, ['TASK-000']);
        assert.deepStrictEqual(payload.downstream, ['TASK-999']);
    });

    test('handles undefined optional fields', () => {
        const task = createTask();
        const payload = buildCardPayload(task, 'Backlog');

        assert.strictEqual(payload.summary, undefined);
        assert.strictEqual(payload.tags, undefined);
        assert.strictEqual(payload.priority, undefined);
    });
});

suite('taskPresentation - buildCodexPrompt', () => {
    test('includes task title as header', () => {
        const task = createTask({ title: 'Implement Feature' });
        const prompt = buildCodexPrompt(task, 'Build');
        assert.ok(prompt.includes('# Task: Implement Feature'));
    });

    test('includes column and priority', () => {
        const task = createTask({ priority: 'high' });
        const prompt = buildCodexPrompt(task, 'Implementation');
        assert.ok(prompt.includes('Column: Implementation'));
        assert.ok(prompt.includes('Priority: high'));
    });

    test('includes summary section', () => {
        const task = createTask({ summary: 'This is the summary' });
        const prompt = buildCodexPrompt(task, 'Build');
        assert.ok(prompt.includes('## Summary'));
        assert.ok(prompt.includes('This is the summary'));
    });

    test('includes context in code block', () => {
        const task = createTask({ context: '# Context\nSome markdown' });
        const prompt = buildCodexPrompt(task, 'Build');
        assert.ok(prompt.includes('## Context'));
        assert.ok(prompt.includes('```markdown'));
        assert.ok(prompt.includes('# Context'));
    });

    test('includes acceptance criteria', () => {
        const task = createTask({ acceptanceCriteria: ['Criteria 1', 'Criteria 2'] });
        const prompt = buildCodexPrompt(task, 'Build');
        assert.ok(prompt.includes('## Acceptance Criteria'));
        assert.ok(prompt.includes('- Criteria 1'));
    });

    test('includes entry points', () => {
        const task = createTask({ entryPoints: ['src/main.ts', 'src/utils.ts'] });
        const prompt = buildCodexPrompt(task, 'Build');
        assert.ok(prompt.includes('## Entry Points'));
        assert.ok(prompt.includes('- src/main.ts'));
    });

    test('includes risks section', () => {
        const task = createTask({ risks: ['Risk A', 'Risk B'] });
        const prompt = buildCodexPrompt(task, 'Build');
        assert.ok(prompt.includes('## Risks'));
        assert.ok(prompt.includes('- Risk A'));
    });
});
