import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from './errors.js';
import { RequestIdempotencyCache, resolveIdempotencyKey } from './request-idempotency.js';
describe('RequestIdempotencyCache', () => {
    it('reuses the first result for the same requestId and payload', async () => {
        const cache = new RequestIdempotencyCache();
        const fn = vi.fn(async () => ({ ok: true }));
        const first = await cache.execute('scope', 'req-1', { a: 1 }, fn);
        const second = await cache.execute('scope', 'req-1', { a: 1 }, fn);
        expect(first).toEqual({ ok: true });
        expect(second).toEqual({ ok: true });
        expect(fn).toHaveBeenCalledTimes(1);
    });
    it('throws when the same requestId uses a different payload', async () => {
        const cache = new RequestIdempotencyCache();
        await cache.execute('scope', 'req-1', { a: 1 }, async () => ({ ok: true }));
        expect(() => cache.execute('scope', 'req-1', { a: 2 }, async () => ({ ok: true }))).toThrow(ConflictError);
    });
});
describe('resolveIdempotencyKey', () => {
    it('prefers X-Idempotency-Key header over body requestId', () => {
        expect(resolveIdempotencyKey({ 'x-idempotency-key': 'header-key' }, 'body-key')).toBe('header-key');
    });
    it('falls back to body requestId', () => {
        expect(resolveIdempotencyKey({}, 'body-key')).toBe('body-key');
    });
});
//# sourceMappingURL=request-idempotency.test.js.map