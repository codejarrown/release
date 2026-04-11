import { HttpClient } from '../lib/http-client.js';
import { Mt5ApiSdk } from '../integrations/mt5/sdk/index.js';
import { createDatabase } from '../db/kysely/index.js';
import { runMigrations } from '../db/migrator.js';
import { Mt5AccountRepository } from '../db/repositories/mt5-account.repository.js';
import { SyncJobRepository } from '../db/repositories/sync-job.repository.js';
import { PushChannelRepository } from '../db/repositories/push-channel.repository.js';
import { AccountGroupRepository } from '../db/repositories/account-group.repository.js';
import { OrderGroupRepository } from '../db/repositories/order-group.repository.js';
import { SpreadSubscriptionRepository } from '../db/repositories/spread-subscription.repository.js';
import { AccountService } from '../services/account.service.js';
import { AccountGroupService } from '../services/account-group.service.js';
import { OrderGroupService } from '../services/order-group.service.js';
import { WsConnectionManager } from '../services/ws-manager.js';
import { PushService } from '../services/push/index.js';
import { SpreadService } from '../services/spread.service.js';
import { AccountHeartbeatService } from '../services/account-heartbeat.service.js';
import { RealtimeApp } from '../realtime/app.js';
import { initializeAccountSessionsOnStartup } from './startup.js';
import { writeQuickReconnectLog } from '../lib/quick-reconnect-log.js';
export async function buildAppContext(config) {
    const db = createDatabase(config);
    await runMigrations(db);
    const mt5Client = new HttpClient({
        baseUrl: config.MT5_API_BASE_URL,
        timeout: config.MT5_TIMEOUT_MS,
        retries: 1,
    });
    const mt5Sdk = new Mt5ApiSdk(mt5Client, {
        wsBaseUrl: config.MT5_WS_BASE_URL,
    });
    const repos = {
        mt5Account: new Mt5AccountRepository(db),
        syncJob: new SyncJobRepository(db),
        pushChannel: new PushChannelRepository(db),
        accountGroup: new AccountGroupRepository(db),
        spreadSubscription: new SpreadSubscriptionRepository(db),
        orderGroup: new OrderGroupRepository(db),
    };
    const pushService = new PushService(repos.pushChannel, config.ACCOUNT_ENCRYPTION_KEY);
    const wsManager = new WsConnectionManager(mt5Sdk, config.MT5_WS_BASE_URL);
    const realtimeApp = new RealtimeApp();
    const orderGroupService = new OrderGroupService(repos.orderGroup, repos.accountGroup, repos.mt5Account, mt5Sdk, pushService);
    const spreadService = new SpreadService(repos.spreadSubscription, repos.accountGroup, wsManager, mt5Sdk, pushService, orderGroupService);
    const accountService = new AccountService(repos.mt5Account, mt5Sdk, config.ACCOUNT_ENCRYPTION_KEY);
    const accountHeartbeatService = new AccountHeartbeatService(accountService, wsManager, realtimeApp);
    orderGroupService.setSpreadService(spreadService);
    const services = {
        account: accountService,
        accountGroup: new AccountGroupService(repos.accountGroup, repos.mt5Account),
        orderGroup: orderGroupService,
        push: pushService,
        spread: spreadService,
        accountHeartbeat: accountHeartbeatService,
    };
    await services.spread.initialize();
    for (const group of await services.orderGroup.listOpenRuntimeGroups()) {
        realtimeApp.syncOrderGroup(group);
    }
    for (const subscriptionId of services.spread.getRuntimeSubscriptionIds()) {
        const snapshot = services.spread.getSnapshot(subscriptionId);
        if (!snapshot)
            continue;
        realtimeApp.syncSpreadSnapshot(subscriptionId, snapshot.subscription.accountGroupId, snapshot);
    }
    services.account.setHooks({
        onConnect: (accountId, sessionId) => {
            wsManager.addSession(accountId, sessionId);
            realtimeApp.markAccountConnected(accountId, sessionId);
            void services.spread.handleAccountConnected(accountId, sessionId);
        },
        onDisconnect: (accountId) => {
            wsManager.removeSession(accountId);
            realtimeApp.markAccountDisconnected(accountId, 'account disconnected');
            services.spread.handleAccountDisconnected(accountId);
        },
    });
    const reconnectingAccounts = new Set();
    const scheduleAccountReconnect = (event) => {
        console.warn('[MT5 Reconnect] disconnect event received', event);
        writeQuickReconnectLog('reconnect.disconnect_received', {
            accountId: event.accountId,
            sessionId: event.sessionId,
            source: event.source,
            reason: event.reason,
        });
        wsManager.removeSession(event.accountId);
        realtimeApp.markAccountDisconnected(event.accountId, event.reason);
        void services.account.markDisconnected(event.accountId, event.reason);
        services.spread.handleAccountDisconnected(event.accountId);
        if (reconnectingAccounts.has(event.accountId)) {
            console.info('[MT5 Reconnect] reconnect already in progress, skip duplicate trigger', {
                accountId: event.accountId,
                source: event.source,
                sessionId: event.sessionId,
            });
            writeQuickReconnectLog('reconnect.skip_duplicate', {
                accountId: event.accountId,
                sessionId: event.sessionId,
                source: event.source,
            });
            return;
        }
        reconnectingAccounts.add(event.accountId);
        void (async () => {
            try {
                const account = await services.account.getById(event.accountId).catch(() => null);
                if (!account || !account.isEnabled || !account.autoReconnectEnabled || account.maxReconnectAttempts <= 0) {
                    console.warn('[MT5 Reconnect] auto-reconnect skipped', {
                        accountId: event.accountId,
                        reason: event.reason,
                        source: event.source,
                        isEnabled: account?.isEnabled ?? false,
                        autoReconnectEnabled: account?.autoReconnectEnabled ?? false,
                        maxReconnectAttempts: account?.maxReconnectAttempts ?? 0,
                    });
                    writeQuickReconnectLog('reconnect.skipped', {
                        accountId: event.accountId,
                        sessionId: event.sessionId,
                        source: event.source,
                        reason: event.reason,
                        isEnabled: account?.isEnabled ?? false,
                        autoReconnectEnabled: account?.autoReconnectEnabled ?? false,
                        maxReconnectAttempts: account?.maxReconnectAttempts ?? 0,
                    });
                    return;
                }
                services.push.broadcast({
                    title: 'Account Disconnected',
                    body: `Account #${event.accountId} disconnected from MT5. Starting auto-reconnect...`,
                    level: 'warn',
                    metadata: {
                        accountId: event.accountId,
                        source: event.source,
                        sessionId: event.sessionId,
                        reason: event.reason,
                    },
                });
                let lastError = null;
                for (let attempt = 1; attempt <= account.maxReconnectAttempts; attempt++) {
                    if (attempt > 1 && account.reconnectDelayMs > 0) {
                        await delay(account.reconnectDelayMs);
                    }
                    console.info('[MT5 Reconnect] reconnect attempt start', {
                        accountId: event.accountId,
                        attempt,
                        maxReconnectAttempts: account.maxReconnectAttempts,
                        source: event.source,
                        reason: event.reason,
                    });
                    writeQuickReconnectLog('reconnect.attempt_start', {
                        accountId: event.accountId,
                        sessionId: event.sessionId,
                        attempt,
                        maxReconnectAttempts: account.maxReconnectAttempts,
                        source: event.source,
                        reason: event.reason,
                    });
                    try {
                        const { sessionId: newSessionId } = await services.account.connect(event.accountId);
                        console.info('[MT5 Reconnect] reconnect succeeded', {
                            accountId: event.accountId,
                            attempt,
                            disconnectedSessionId: event.sessionId,
                            newSessionId,
                        });
                        writeQuickReconnectLog('reconnect.succeeded', {
                            accountId: event.accountId,
                            sessionId: event.sessionId,
                            attempt,
                            disconnectedSessionId: event.sessionId,
                            newSessionId,
                        });
                        return;
                    }
                    catch (err) {
                        lastError = err instanceof Error ? err.message : String(err);
                        console.error('[MT5 Reconnect] reconnect attempt failed', {
                            accountId: event.accountId,
                            attempt,
                            error: lastError,
                        });
                        writeQuickReconnectLog('reconnect.attempt_failed', {
                            accountId: event.accountId,
                            sessionId: event.sessionId,
                            attempt,
                            error: lastError,
                        });
                        await services.account.setLastError(event.accountId, lastError);
                    }
                }
                if (lastError) {
                    writeQuickReconnectLog('reconnect.failed', {
                        accountId: event.accountId,
                        sessionId: event.sessionId,
                        error: lastError,
                        source: event.source,
                    });
                    services.push.broadcast({
                        title: 'Account Auto-Reconnect Failed',
                        body: `Account #${event.accountId} auto-reconnect failed: ${lastError}`,
                        level: 'error',
                        metadata: { accountId: event.accountId, error: lastError, source: event.source },
                    });
                }
            }
            finally {
                reconnectingAccounts.delete(event.accountId);
            }
        })();
    };
    wsManager.on('accountDisconnected', (event) => {
        scheduleAccountReconnect(event);
    });
    wsManager.on('accountError', (event) => {
        console.error('[MT5 WS] accountError', event);
        writeQuickReconnectLog('mt5.accountError', {
            accountId: event.accountId,
            sessionId: event.sessionId,
            message: event.message,
            source: event.source,
        });
        realtimeApp.markAccountError(event.accountId, event.message);
        void services.account.setLastError(event.accountId, event.message);
        if (event.source === 'connectProgress') {
            return;
        }
        services.push.broadcast({
            title: 'Account Error',
            body: `Account #${event.accountId} encountered an error: ${event.message}`,
            level: 'error',
            metadata: { accountId: event.accountId, error: event.message },
        });
    });
    wsManager.on('orderUpdate', (event) => {
        realtimeApp.syncOrderUpdate(event);
        services.push.broadcast({
            title: 'Order Update',
            body: `Account #${event.accountId}: Order #${event.order.ticket ?? 'N/A'} ${event.order.symbol ?? ''} updated.`,
            level: 'info',
            metadata: { accountId: event.accountId, order: event.order },
        });
    });
    wsManager.on('orderUpdateSnapshot', (event) => {
        realtimeApp.syncOrderSnapshot(event);
    });
    services.orderGroup.on('orderGroupUpdate', (group) => {
        realtimeApp.syncOrderGroup(group);
    });
    services.orderGroup.on('orderGroupRemove', (payload) => {
        realtimeApp.removeOrderGroup(payload.groupId, payload.accountGroupId);
    });
    wsManager.on('quote', (quote) => {
        realtimeApp.upsertQuote(quote);
        void services.spread.handleQuote(quote);
    });
    services.spread.on('spreadUpdate', (payload) => {
        realtimeApp.syncSpreadSnapshot(payload.subscriptionId, payload.accountGroupId, payload.snapshot);
    });
    services.spread.on('spreadHeartbeat', (payload) => {
        realtimeApp.syncSpreadHeartbeat(payload);
    });
    services.spread.on('spreadRuntimeState', (payload) => {
        realtimeApp.syncSpreadRuntimeState(payload);
    });
    void initializeAccountSessionsOnStartup({
        mt5Sdk,
        accountRepo: repos.mt5Account,
        accountService: services.account,
        pushService: services.push,
        wsManager,
    }).catch((err) => {
        // 启动同步失败不阻塞应用启动，仅记录日志
        console.error('Failed to initialize account sessions on startup:', err);
    });
    services.accountHeartbeat.start();
    return {
        config,
        db,
        mt5Client,
        mt5Sdk,
        repos,
        services,
        wsManager,
        realtime: {
            app: realtimeApp,
        },
    };
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=index.js.map