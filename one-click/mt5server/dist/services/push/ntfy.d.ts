import type { PushSender, PushMessage } from './gateway.js';
export declare class NtfyQuotaExceededError extends Error {
    readonly statusCode: number;
    readonly errorCode: number | null;
    constructor(message: string, statusCode: number, errorCode: number | null);
}
export declare class NtfySender implements PushSender {
    readonly platform = "ntfy";
    send(message: PushMessage, config: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=ntfy.d.ts.map