export interface PushMessage {
    title: string;
    body: string;
    level?: 'info' | 'warn' | 'error';
    metadata?: Record<string, unknown>;
}
export interface PushSender {
    readonly platform: string;
    send(message: PushMessage, config: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=gateway.d.ts.map