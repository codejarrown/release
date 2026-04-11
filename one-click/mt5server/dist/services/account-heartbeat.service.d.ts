import type { RealtimeApp } from '../realtime/app.js';
import type { WsConnectionManager } from './ws-manager.js';
import type { AccountService } from './account.service.js';
interface AccountHeartbeatServiceOptions {
    intervalMs?: number;
}
export declare class AccountHeartbeatService {
    private readonly accountService;
    private readonly wsManager;
    private readonly realtimeApp;
    private readonly options;
    private timer;
    private running;
    constructor(accountService: AccountService, wsManager: WsConnectionManager, realtimeApp: RealtimeApp, options?: AccountHeartbeatServiceOptions);
    start(): void;
    close(): void;
    private tick;
}
export {};
//# sourceMappingURL=account-heartbeat.service.d.ts.map