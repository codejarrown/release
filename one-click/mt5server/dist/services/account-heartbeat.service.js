export class AccountHeartbeatService {
    accountService;
    wsManager;
    realtimeApp;
    options;
    timer = null;
    running = false;
    constructor(accountService, wsManager, realtimeApp, options = {}) {
        this.accountService = accountService;
        this.wsManager = wsManager;
        this.realtimeApp = realtimeApp;
        this.options = options;
    }
    start() {
        if (this.timer)
            return;
        void this.tick();
        this.timer = setInterval(() => {
            void this.tick();
        }, this.options.intervalMs ?? 10_000);
    }
    close() {
        if (!this.timer)
            return;
        clearInterval(this.timer);
        this.timer = null;
    }
    async tick() {
        if (this.running)
            return;
        this.running = true;
        try {
            const sessions = this.wsManager.listActiveSessions();
            await Promise.allSettled(sessions.map(async ({ accountId, sessionId }) => {
                try {
                    const result = await this.accountService.getPing(accountId);
                    this.realtimeApp.syncWsHeartBeat({
                        accountId,
                        sessionId,
                        latencyMs: result.latencyMs,
                        host: result.host,
                        port: result.port,
                        error: null,
                    });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.realtimeApp.syncWsHeartBeat({
                        accountId,
                        sessionId,
                        latencyMs: null,
                        host: null,
                        port: null,
                        error: message,
                    });
                }
            }));
        }
        finally {
            this.running = false;
        }
    }
}
//# sourceMappingURL=account-heartbeat.service.js.map