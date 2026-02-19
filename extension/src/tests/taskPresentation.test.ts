import { strict as assert } from 'assert';
import {
    buildTaskDescription,
    buildTaskTooltip,
    buildTaskDetail,
    buildCardPayload,

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
        const task = createTask({ status: 'in_progress' });
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

    test('includes description when set', () => {
        const task = createTask({ description: 'This is a test description' });
        const tooltip = buildTaskTooltip(task, 'Backlog');
        assert.ok(tooltip.includes('Description: This is a test description'));
    });

    test('includes workflow when set', () => {
        const task = createTask({ workflow: 'feature' });
        const tooltip = buildTaskTooltip(task, 'Backlog');
        assert.ok(tooltip.includes('Workflow: feature'));
    });

    test('includes dependsOn count when set', () => {
        const task = createTask({ dependsOn: ['TASK-002', 'TASK-003'] });
        const tooltip = buildTaskTooltip(task, 'Backlog');
        assert.ok(tooltip.includes('Depends On: 2 task(s)'));
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
            title: 'Test Task',
            description: 'Updated Description',
            tags: ['tag1', 'tag2'],
            // priority removed
            status: 'in_progress',
            workflow: 'feature',
        });

        const payload = buildCardPayload(task, 'Implementation');

        assert.strictEqual(payload.id, 'TASK-001');
        assert.strictEqual(payload.title, 'Test Task');
        assert.strictEqual(payload.description, 'Updated Description');
        assert.strictEqual(payload.tags, 'tag1, tag2');
        // priority removed
        assert.strictEqual(payload.status, 'in_progress');
        assert.strictEqual(payload.column, 'Implementation');
        assert.strictEqual(payload.workflow, 'feature');
    });

    test('handles undefined optional fields', () => {
        const task = createTask();
        const payload = buildCardPayload(task, 'Backlog');

        assert.strictEqual(payload.description, undefined);
        assert.strictEqual(payload.tags, undefined);
        // priority removed
    });

    test('includes dependsOn when set', () => {
        const task = createTask({ dependsOn: ['TASK-002', 'TASK-003'] });
        const payload = buildCardPayload(task, 'Build');

        assert.deepStrictEqual(payload.dependsOn, ['TASK-002', 'TASK-003']);
    });

    test('dependsOn is undefined when not set', () => {
        const task = createTask();
        const payload = buildCardPayload(task, 'Build');

        assert.strictEqual(payload.dependsOn, undefined);
    });
});


