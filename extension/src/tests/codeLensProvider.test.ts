import { strict as assert } from 'assert';

// Testing CodeLens provider logic patterns
// The actual provider requires VS Code APIs,
// so we test the pure logic patterns here.

suite('CodeLensProvider - Task ID Regex', () => {
    const taskRegex = /TASK-\d{3,}/g;

    test('matches 3-digit task IDs', () => {
        const text = 'Fix TASK-001 issue';
        const match = text.match(taskRegex);
        assert.ok(match);
        assert.strictEqual(match![0], 'TASK-001');
    });

    test('matches 4-digit task IDs', () => {
        const text = 'Working on TASK-1234';
        const match = text.match(taskRegex);
        assert.ok(match);
        assert.strictEqual(match![0], 'TASK-1234');
    });

    test('finds multiple task IDs', () => {
        const text = 'TASK-001 depends on TASK-002 and TASK-003';
        const matches = text.match(taskRegex);
        assert.ok(matches);
        assert.strictEqual(matches!.length, 3);
    });

    test('returns null for no matches', () => {
        const text = 'No task references here';
        const matches = text.match(taskRegex);
        assert.strictEqual(matches, null);
    });
});

suite('CodeLensProvider - Status Icons', () => {
    function getStatusIcon(status: string): string {
        const icons: Record<string, string> = {
            'todo': '○',
            'in_progress': '◉',
            'needs_feedback': '◐',
            'blocked': '●',
            'done': '✓',
        };
        return icons[status] || '○';
    }

    test('returns correct icon for in_progress', () => {
        assert.strictEqual(getStatusIcon('in_progress'), '◉');
    });

    test('returns correct icon for todo', () => {
        assert.strictEqual(getStatusIcon('todo'), '○');
    });

    test('returns correct icon for needs_feedback', () => {
        assert.strictEqual(getStatusIcon('needs_feedback'), '◐');
    });

    test('returns correct icon for blocked', () => {
        assert.strictEqual(getStatusIcon('blocked'), '●');
    });

    test('returns correct icon for done', () => {
        assert.strictEqual(getStatusIcon('done'), '✓');
    });

    test('returns default icon for unknown status', () => {
        assert.strictEqual(getStatusIcon('unknown'), '○');
    });
});

suite('CodeLensProvider - Task Title Format', () => {
    interface Task {
        id: string;
        title: string;
        status?: string;
        priority?: string;
    }

    function formatTaskTitle(task: Task): string {
        const icons: Record<string, string> = {
            'todo': '○',
            'in_progress': '◉',
            'needs_feedback': '◐',
            'blocked': '●',
            'done': '✓',
        };
        const status = icons[task.status || 'todo'] || '○';
        const priority = task.priority ? ` [${task.priority.toUpperCase()}]` : '';
        return `${status} ${task.title}${priority}`;
    }

    test('formats basic task', () => {
        const task: Task = { id: 'TASK-001', title: 'Fix bug' };
        assert.strictEqual(formatTaskTitle(task), '○ Fix bug');
    });

    test('includes priority when set', () => {
        const task: Task = { id: 'TASK-001', title: 'Fix bug', priority: 'high' };
        assert.strictEqual(formatTaskTitle(task), '○ Fix bug [HIGH]');
    });

    test('shows correct status icon', () => {
        const task: Task = { id: 'TASK-001', title: 'Fix bug', status: 'blocked' };
        assert.strictEqual(formatTaskTitle(task), '● Fix bug');
    });

    test('shows status and priority together', () => {
        const task: Task = { id: 'TASK-001', title: 'Fix bug', status: 'done', priority: 'p0' };
        assert.strictEqual(formatTaskTitle(task), '✓ Fix bug [P0]');
    });
});

suite('CodeLensProvider - Task Tooltip Format', () => {
    interface Task {
        id: string;
        title: string;
        status?: string;
        priority?: string;
        summary?: string;
        owner?: string;
    }

    function formatTaskTooltip(task: Task): string {
        const lines = [
            `Task: ${task.title}`,
            `ID: ${task.id}`,
            `Status: ${task.status || 'todo'}`,
            `Priority: ${task.priority}`,
        ];

        if (task.owner) {
            lines.push(`Owner: ${task.owner}`);
        }

        if (task.summary) {
            lines.push('', `Summary: ${task.summary.substring(0, 100)}...`);
        }

        return lines.join('\n');
    }

    test('includes basic task info', () => {
        const task: Task = { id: 'TASK-001', title: 'Fix bug', status: 'todo', priority: 'medium' };
        const tooltip = formatTaskTooltip(task);
        assert.ok(tooltip.includes('Task: Fix bug'));
        assert.ok(tooltip.includes('ID: TASK-001'));
        assert.ok(tooltip.includes('Status: todo'));
        assert.ok(tooltip.includes('Priority: medium'));
    });

    test('includes owner when set', () => {
        const task: Task = { id: 'TASK-001', title: 'Fix bug', owner: 'Cursor' };
        const tooltip = formatTaskTooltip(task);
        assert.ok(tooltip.includes('Owner: Cursor'));
    });

    test('truncates long summary', () => {
        const longSummary = 'A'.repeat(200);
        const task: Task = { id: 'TASK-001', title: 'Fix bug', summary: longSummary };
        const tooltip = formatTaskTooltip(task);
        assert.ok(tooltip.includes('Summary:'));
        assert.ok(tooltip.includes('...'));
    });
});

suite('CodeLensProvider - Unique Task ID Extraction', () => {
    test('extracts unique task IDs', () => {
        const text = 'TASK-001 depends on TASK-002. Also TASK-001 again.';
        const taskIds = new Set<string>();
        const regex = /TASK-\d{3,}/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            taskIds.add(match[0]);
        }

        assert.strictEqual(taskIds.size, 2);
        assert.ok(taskIds.has('TASK-001'));
        assert.ok(taskIds.has('TASK-002'));
    });
});
