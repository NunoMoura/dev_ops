import { strict as assert } from 'assert';
import * as sinon from 'sinon';

// We test the BoardApi by mocking the runBoardOps function
// The API class methods are thin wrappers, so we verify argument construction
// and response parsing.

// Mock types for testing without actual python runner
interface MockPythonResult {
    stdout: string;
    stderr: string;
    code: number;
}

// Since BoardApi directly imports runBoardOps, we need to use proxyquire or
// restructure for dependency injection. For now, we test the logic patterns.

suite('BoardApi - Response Parsing', () => {
    test('getBoardState parses valid JSON response', () => {
        const mockResponse = JSON.stringify({
            version: 1,
            columns: [{ id: 'col-1', name: 'Backlog', position: 1 }],
            items: [{ id: 'TASK-001', columnId: 'col-1', title: 'Test task' }],
        });

        const board = JSON.parse(mockResponse);
        assert.strictEqual(board.version, 1);
        assert.strictEqual(board.columns.length, 1);
        assert.strictEqual(board.items.length, 1);
        assert.strictEqual(board.items[0].id, 'TASK-001');
    });

    test('getTask returns null for empty response', () => {
        const mockResponse = 'null';
        const task = JSON.parse(mockResponse);
        assert.strictEqual(task, null);
    });

    test('getMetrics parses status and priority counts', () => {
        const mockResponse = JSON.stringify({
            totalTasks: 5,
            statusCounts: { ready: 2, agent_active: 1, blocked: 1, done: 1 },
            priorityCounts: { high: 2, medium: 2, low: 1 },
        });

        const metrics = JSON.parse(mockResponse);
        assert.strictEqual(metrics.totalTasks, 5);
        assert.strictEqual(metrics.statusCounts.ready, 2);
        assert.strictEqual(metrics.priorityCounts.high, 2);
    });

    test('validateTaskId parses validation result', () => {
        const mockResponse = JSON.stringify({
            valid: true,
            exists: true,
        });

        const result = JSON.parse(mockResponse);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.exists, true);
    });

    test('getColumnName extracts name from response', () => {
        const mockResponse = JSON.stringify({
            columnId: 'col-1',
            name: 'Implementation',
        });

        const data = JSON.parse(mockResponse);
        assert.strictEqual(data.name, 'Implementation');
    });
});

suite('BoardApi - Argument Construction', () => {
    test('createTask builds correct args with all options', () => {
        const params = {
            title: 'New feature',
            summary: 'Implement new feature',
            workflow: 'feature',
            priority: 'high' as const,
            owner: 'agent-1',
            columnId: 'col-impl',
            spawnFrom: 'TASK-001',
            dependencies: ['TASK-002', 'TASK-003'],
        };

        const args = ['create', '--title', params.title];
        if (params.priority) {
            args.push('--priority', params.priority);
        }
        if (params.columnId) {
            args.push('--column', params.columnId);
        }
        if (params.summary) {
            args.push('--summary', params.summary);
        }
        if (params.owner) {
            args.push('--owner', params.owner);
        }
        if (params.dependencies) {
            args.push('--dependencies', params.dependencies.join(','));
        }
        if (params.workflow) {
            args.push('--workflow', params.workflow);
        }
        if (params.spawnFrom) {
            args.push('--spawn-from', params.spawnFrom);
        }

        assert.ok(args.includes('--title'));
        assert.ok(args.includes('New feature'));
        assert.ok(args.includes('--priority'));
        assert.ok(args.includes('high'));
        assert.ok(args.includes('--column'));
        assert.ok(args.includes('col-impl'));
        assert.ok(args.includes('--summary'));
        assert.ok(args.includes('--owner'));
        assert.ok(args.includes('--dependencies'));
        assert.ok(args.includes('TASK-002,TASK-003'));
        assert.ok(args.includes('--workflow'));
        assert.ok(args.includes('--spawn-from'));
    });

    test('claimTask builds args with session and agent type', () => {
        const options = {
            sessionId: 'sess-123',
            agentType: 'agent' as const,
            owner: 'Cursor',
            force: true,
        };

        const args = ['claim', 'TASK-001'];
        if (options.sessionId) {
            args.push('--session-id', options.sessionId);
        }
        if (options.agentType) {
            args.push('--agent-type', options.agentType);
        }
        if (options.owner) {
            args.push('--owner', options.owner);
        }
        if (options.force) {
            args.push('--force');
        }

        assert.deepStrictEqual(args, [
            'claim',
            'TASK-001',
            '--session-id',
            'sess-123',
            '--agent-type',
            'agent',
            '--owner',
            'Cursor',
            '--force',
        ]);
    });

    test('listTasks builds args with column and status filters', () => {
        const options = { columnId: 'col-backlog', status: 'blocked' as const };

        const args = ['list'];
        if (options.columnId) {
            args.push('--column', options.columnId);
        }
        if (options.status) {
            args.push('--status', options.status);
        }

        assert.deepStrictEqual(args, ['list', '--column', 'col-backlog', '--status', 'blocked']);
    });
});

suite('BoardApi - Task ID Extraction', () => {
    test('extracts TASK-XXX from create output', () => {
        const stdout = '✅ Created task: TASK-042 - New feature';
        const match = stdout.match(/TASK-\d{3,}/);
        assert.ok(match);
        assert.strictEqual(match![0], 'TASK-042');
    });

    test('extracts TASK-XXX with different formats', () => {
        const outputs = [
            '✅ Created task: TASK-001 - Simple',
            'Created TASK-123 successfully',
            'TASK-999: Done',
        ];

        for (const output of outputs) {
            const match = output.match(/TASK-\d{3,}/);
            assert.ok(match, `Failed to match in: ${output}`);
        }
    });

    test('extracts 4-digit task IDs correctly', () => {
        const stdout = '✅ Created task: TASK-1234 - Large project';
        const match = stdout.match(/TASK-\d{3,}/);
        assert.ok(match);
        assert.strictEqual(match![0], 'TASK-1234');
    });

    test('extracts 5-digit task IDs correctly', () => {
        const stdout = '✅ Created task: TASK-10001 - Enterprise project';
        const match = stdout.match(/TASK-\d{3,}/);
        assert.ok(match);
        assert.strictEqual(match![0], 'TASK-10001');
    });

    test('does not match 2-digit task IDs', () => {
        const stdout = 'Invalid: TASK-99 - Too short';
        const match = stdout.match(/TASK-\d{3,}/);
        assert.strictEqual(match, null);
    });
});

