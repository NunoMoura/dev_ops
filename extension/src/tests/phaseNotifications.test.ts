import { strict as assert } from 'assert';

// Testing the pure functions from phaseNotifications
// The main notification function requires VS Code environment

// Re-implement the testable logic here for testing

const PHASE_INFO: Record<string, { name: string; position: number }> = {
    'col-backlog': { name: 'Backlog', position: 1 },
    'col-understand': { name: 'Understand', position: 2 },
    'col-plan': { name: 'Plan', position: 3 },
    'col-implement': { name: 'Build', position: 4 },
    'col-verify': { name: 'Verify', position: 5 },
    'col-done': { name: 'Done', position: 6 },
};

function isBackwardMovement(fromColumnId: string | undefined, toColumnId: string): boolean {
    if (!fromColumnId) {
        return false;
    }
    const fromPos = PHASE_INFO[fromColumnId]?.position ?? 0;
    const toPos = PHASE_INFO[toColumnId]?.position ?? 0;
    return toPos < fromPos;
}

function getWorkflowForPhase(
    fromColumnId: string | undefined,
    toColumnId: string
): { workflow: string; isBackward: boolean } | undefined {
    if (toColumnId === 'col-done') {
        return undefined;
    }
    if (toColumnId === 'col-backlog') {
        return undefined;
    }
    const backward = isBackwardMovement(fromColumnId, toColumnId);
    if (fromColumnId === 'col-backlog') {
        return { workflow: 'pick_task', isBackward: false };
    }
    return { workflow: 'next_phase', isBackward: backward };
}

suite('phaseNotifications - PHASE_INFO', () => {
    test('has correct phase positions', () => {
        assert.strictEqual(PHASE_INFO['col-backlog'].position, 1);
        assert.strictEqual(PHASE_INFO['col-understand'].position, 2);
        assert.strictEqual(PHASE_INFO['col-plan'].position, 3);
        assert.strictEqual(PHASE_INFO['col-implement'].position, 4);
        assert.strictEqual(PHASE_INFO['col-verify'].position, 5);
        assert.strictEqual(PHASE_INFO['col-done'].position, 6);
    });

    test('has correct phase names', () => {
        assert.strictEqual(PHASE_INFO['col-backlog'].name, 'Backlog');
        assert.strictEqual(PHASE_INFO['col-implement'].name, 'Build');
        assert.strictEqual(PHASE_INFO['col-done'].name, 'Done');
    });
});

suite('phaseNotifications - isBackwardMovement', () => {
    test('returns false when fromColumnId is undefined', () => {
        assert.strictEqual(isBackwardMovement(undefined, 'col-implement'), false);
    });

    test('returns true for Build → Plan (backward)', () => {
        assert.strictEqual(isBackwardMovement('col-implement', 'col-plan'), true);
    });

    test('returns true for Verify → Build (backward)', () => {
        assert.strictEqual(isBackwardMovement('col-verify', 'col-implement'), true);
    });

    test('returns false for Plan → Build (forward)', () => {
        assert.strictEqual(isBackwardMovement('col-plan', 'col-implement'), false);
    });

    test('returns false for Backlog → Understand (forward)', () => {
        assert.strictEqual(isBackwardMovement('col-backlog', 'col-understand'), false);
    });

    test('returns false for same column', () => {
        assert.strictEqual(isBackwardMovement('col-implement', 'col-implement'), false);
    });

    test('handles unknown columns (returns false)', () => {
        assert.strictEqual(isBackwardMovement('col-unknown', 'col-implement'), false);
    });
});

suite('phaseNotifications - getWorkflowForPhase', () => {
    test('returns undefined for Done column', () => {
        assert.strictEqual(getWorkflowForPhase('col-implement', 'col-done'), undefined);
    });

    test('returns undefined for Backlog column', () => {
        assert.strictEqual(getWorkflowForPhase('col-implement', 'col-backlog'), undefined);
    });

    test('returns pick_task from Backlog', () => {
        const result = getWorkflowForPhase('col-backlog', 'col-understand');
        assert.deepStrictEqual(result, { workflow: 'pick_task', isBackward: false });
    });

    test('returns next_phase with isBackward:false for forward movement', () => {
        const result = getWorkflowForPhase('col-plan', 'col-implement');
        assert.deepStrictEqual(result, { workflow: 'next_phase', isBackward: false });
    });

    test('returns next_phase with isBackward:true for backward movement', () => {
        const result = getWorkflowForPhase('col-verify', 'col-implement');
        assert.deepStrictEqual(result, { workflow: 'next_phase', isBackward: true });
    });

    test('returns next_phase for undefined fromColumn', () => {
        const result = getWorkflowForPhase(undefined, 'col-implement');
        assert.deepStrictEqual(result, { workflow: 'next_phase', isBackward: false });
    });
});
