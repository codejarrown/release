import type { PushSender, PushMessage } from './gateway.js';
export declare class BarkSender implements PushSender {
    readonly platform = "bark";
    send(message: PushMessage, config: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=bark.d.ts.map