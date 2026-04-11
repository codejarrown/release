import type { PushSender, PushMessage } from './gateway.js';
export declare class WebhookSender implements PushSender {
    readonly platform = "webhook";
    send(message: PushMessage, config: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=webhook.d.ts.map