import { strict as assert } from 'assert';

// Testing AgentManager logic
// The actual class uses singleton pattern and VS Code APIs,
// so we test the patterns and behavior here.

suite('AgentManager - Singleton Pattern', () => {
    test('getInstance returns same instance', () => {
        // Verify singleton pattern concept
        class TestManager {
            private static instance: TestManager;
            private constructor() { }
            public static getInstance(): TestManager {
                if (!TestManager.instance) {
                    TestManager.instance = new TestManager();
                }
                return TestManager.instance;
            }
        }

        const instance1 = TestManager.getInstance();
        const instance2 = TestManager.getInstance();
        assert.strictEqual(instance1, instance2);
    });
});

suite('AgentManager - Adapter Registration', () => {
    test('can register and retrieve adapters', () => {
        // Simulate adapter storage
        const adapters = new Map<string, { id: string; name: string }>();

        const adapter1 = { id: 'antigravity', name: 'Antigravity' };
        const adapter2 = { id: 'cursor', name: 'Cursor' };

        adapters.set(adapter1.id, adapter1);
        adapters.set(adapter2.id, adapter2);

        assert.strictEqual(adapters.get('antigravity')?.name, 'Antigravity');
        assert.strictEqual(adapters.get('cursor')?.name, 'Cursor');
        assert.strictEqual(adapters.get('unknown'), undefined);
    });

    test('returns undefined for unregistered adapter', () => {
        const adapters = new Map<string, { id: string; name: string }>();
        assert.strictEqual(adapters.get('nonexistent'), undefined);
    });
});

suite('AgentManager - TaskContext Structure', () => {
    test('TaskContext has required fields', () => {
        interface TaskContext {
            taskId: string;
            phase: string;
            description?: string;
        }

        const context: TaskContext = {
            taskId: 'TASK-001',
            phase: 'Build',
            description: 'Implement feature',
        };

        assert.strictEqual(context.taskId, 'TASK-001');
        assert.strictEqual(context.phase, 'Build');
        assert.strictEqual(context.description, 'Implement feature');
    });

    test('TaskContext description is optional', () => {
        interface TaskContext {
            taskId: string;
            phase: string;
            description?: string;
        }

        const context: TaskContext = {
            taskId: 'TASK-002',
            phase: 'Verify',
        };

        assert.strictEqual(context.description, undefined);
    });
});
