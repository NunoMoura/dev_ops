import { strict as assert } from 'assert';
import { formatError } from '../core';

suite('errors - formatError', () => {
    test('returns message for Error instance', () => {
        const error = new Error('Something went wrong');
        assert.strictEqual(formatError(error), 'Something went wrong');
    });

    test('returns stringified value for non-Error', () => {
        assert.strictEqual(formatError('plain string'), 'plain string');
        assert.strictEqual(formatError(123), '123');
        assert.strictEqual(formatError(null), 'null');
        assert.strictEqual(formatError(undefined), 'undefined');
    });

    test('handles objects', () => {
        const obj = { code: 'ENOENT' };
        assert.strictEqual(formatError(obj), '[object Object]');
    });
});
