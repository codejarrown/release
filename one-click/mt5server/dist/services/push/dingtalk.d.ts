import type { PushSender, PushMessage } from './gateway.js';
export declare class DingTalkSender implements PushSender {
    readonly platform = "dingtalk";
    send(message: PushMessage, config: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=dingtalk.d.ts.map