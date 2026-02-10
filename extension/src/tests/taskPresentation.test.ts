import { strict as assert } from 'assert';
import {
    buildTaskDescription,
    buildTaskTooltip,
    buildTaskDetail,
    buildCardPayload,
    buildCodexPrompt,
} from '../services/tasks';
import { Task } from '../types';

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

    // Priority description test removed

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
        const task = createTask({ status: 'todo' });
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


});

suite('taskPresentation - buildTaskDetail', () => {
    test('includes column', () => {
        const task = createTask();
        const detail = buildTaskDetail(task, 'Planning');
        assert.ok(detail.includes('Column: Planning'));
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
            // priority removed
            status: 'in_progress',
            workflow: 'feature',
        });

        const payload = buildCardPayload(task, 'Implementation');

        assert.strictEqual(payload.id, 'TASK-001');
        assert.strictEqual(payload.title, 'Card Task');
        assert.strictEqual(payload.summary, 'Summary text');
        assert.strictEqual(payload.tags, 'tag1, tag2');
        // priority removed
        assert.strictEqual(payload.status, 'in_progress');
        assert.strictEqual(payload.column, 'Implementation');
        assert.strictEqual(payload.workflow, 'feature');
    });

    test('handles undefined optional fields', () => {
        const task = createTask();
        const payload = buildCardPayload(task, 'Backlog');

        assert.strictEqual(payload.summary, undefined);
        assert.strictEqual(payload.tags, undefined);
        // priority removed
    });
});

suite('taskPresentation - buildCodexPrompt', () => {
    test('includes task title as header', () => {
        const task = createTask({ title: 'Implement Feature' });
        const prompt = buildCodexPrompt(task, 'Build');
        assert.ok(prompt.includes('# Task: Implement Feature'));
    });

    test('includes column', () => {
        const task = createTask();
        const prompt = buildCodexPrompt(task, 'Implementation');
        assert.ok(prompt.includes('Column: Implementation'));
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
