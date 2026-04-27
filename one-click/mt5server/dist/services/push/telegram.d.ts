import type { PushSender, PushMessage } from './gateway.js';
export declare class TelegramSender implements PushSender {
    readonly platform = "telegram";
    send(message: PushMessage, config: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=telegram.d.ts.map