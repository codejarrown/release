import { ConflictError, ValidationError } from './errors.js';
function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    const entries = Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
        .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
        .join(',')}}`;
}
export class RequestIdempotencyCache {
    ttlMs;
    entries = new Map();
    constructor(ttlMs = 5 * 60 * 1000) {
        this.ttlMs = ttlMs;
    }
    execute(scope, requestId, payload, fn) {
        this.cleanupExpired();
        const normalizedRequestId = requestId?.trim();
        if (!normalizedRequestId) {
            return fn();
        }
        if (normalizedRequestId.length > 200) {
            throw new ValidationError('requestId 过长');
        }
        const key = `${scope}:${normalizedRequestId}`;
        const fingerprint = stableStringify(payload);
        const existing = this.entries.get(key);
        if (existing) {
            if (existing.fingerprint !== fingerprint) {
                throw new ConflictError('相同 requestId 的请求体不一致');
            }
            return existing.promise;
        }
        const promise = fn().catch((error) => {
            this.entries.delete(key);
            throw error;
        });
        this.entries.set(key, {
            fingerprint,
            promise,
            expiresAt: Date.now() + this.ttlMs,
        });
        return promise;
    }
    clear() {
        this.entries.clear();
    }
    cleanupExpired() {
        const now = Date.now();
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt <= now) {
                this.entries.delete(key);
            }
        }
    }
}
export function resolveIdempotencyKey(headers, bodyRequestId) {
    const headerValue = headers['x-idempotency-key'];
    if (typeof headerValue === 'string' && headerValue.trim()) {
        return headerValue.trim();
    }
    if (Array.isArray(headerValue)) {
        const first = headerValue.find((item) => typeof item === 'string' && item.trim());
        if (typeof first === 'string') {
            return first.trim();
        }
    }
    return bodyRequestId?.trim() || undefined;
}
//# sourceMappingURL=request-idempotency.js.map