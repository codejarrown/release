export declare class RequestIdempotencyCache {
    private readonly ttlMs;
    private readonly entries;
    constructor(ttlMs?: number);
    execute<T>(scope: string, requestId: string | undefined, payload: unknown, fn: () => Promise<T>): Promise<T>;
    clear(): void;
    private cleanupExpired;
}
export declare function resolveIdempotencyKey(headers: Record<string, unknown>, bodyRequestId?: string): string | undefined;
//# sourceMappingURL=request-idempotency.d.ts.map