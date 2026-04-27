import { EventEmitter } from 'node:events';
import { writeQuickReconnectLog } from '../lib/quick-reconnect-log.js';
/**
 * Manages a **single** upstream MT5 WebSocket connection (global `/api/ws`).
 *
 * Maintains a sessionId → accountId mapping so that incoming session-scoped
 * events can be attributed to the correct local account.
 */
export class WsConnectionManager extends EventEmitter {
    mt5Sdk;
    wsBaseUrl;
    ws = null;
    sessionToAccount = new Map();
    constructor(mt5Sdk, wsBaseUrl) {
        super();
        this.mt5Sdk = mt5Sdk;
        this.wsBaseUrl = wsBaseUrl;
    }
    addSession(accountId, sessionId) {
        this.sessionToAccount.set(sessionId, accountId);
        this.ensureConnected();
    }
    removeSession(accountId) {
        for (const [sid, aid] of this.sessionToAccount) {
            if (aid === accountId) {
                this.sessionToAccount.delete(sid);
            }
        }
        if (this.sessionToAccount.size === 0) {
            this.closeWs();
        }
    }
    async subscribeSymbols(accountId, symbols, sessionId) {
        if (!this.sessionToAccount.has(sessionId))
            return;
        await this.mt5Sdk.subscriptions.subscribeMultiple({ symbols }, sessionId);
    }
    getActiveAccountIds() {
        return [...new Set(this.sessionToAccount.values())];
    }
    getAccountIdBySession(sessionId) {
        return this.sessionToAccount.get(sessionId);
    }
    listActiveSessions() {
        return [...this.sessionToAccount.entries()]
            .map(([sessionId, accountId]) => ({ accountId, sessionId }))
            .sort((a, b) => a.accountId - b.accountId);
    }
    closeAll() {
        this.sessionToAccount.clear();
        this.closeWs();
    }
    ensureConnected() {
        if (this.ws)
            return;
        this.ws = this.mt5Sdk.createWsClient({ baseUrl: this.wsBaseUrl });
        this.ws.on('quote', (quote, sessionId) => {
            const accountId = this.sessionToAccount.get(sessionId);
            if (accountId === undefined)
                return;
            const downstream = {
                accountId,
                sessionId,
                symbol: quote.symbol ?? '',
                bid: quote.bid ?? 0,
                ask: quote.ask ?? 0,
                last: quote.last ?? 0,
                volume: quote.volume ?? 0,
                time: normalizeMtApiQuoteTime(quote.time),
            };
            this.emit('quote', downstream);
        });
        this.ws.on('orderUpdate', (order, sessionId) => {
            const accountId = this.sessionToAccount.get(sessionId);
            if (accountId === undefined)
                return;
            this.emit('orderUpdate', { accountId, sessionId, order });
        });
        this.ws.on('orderUpdateSnapshot', (orders, sessionId) => {
            const accountId = this.sessionToAccount.get(sessionId);
            if (accountId === undefined)
                return;
            this.emit('orderUpdateSnapshot', { accountId, sessionId, data: orders });
        });
        this.ws.on('connectProgress', (data, sessionId) => {
            const accountId = this.sessionToAccount.get(sessionId);
            if (accountId === undefined)
                return;
            const progress = normalizeConnectProgress(data);
            const exception = normalizeExceptionMessage(data.exception);
            console.warn('[MT5 WS] connectProgress', {
                accountId,
                sessionId,
                progress,
                exception,
            });
            writeQuickReconnectLog('mt5.connectProgress', {
                accountId,
                sessionId,
                progress,
                exception,
            });
            this.emit('accountConnectProgress', {
                accountId,
                sessionId,
                progress,
                exception,
            });
            if (isDisconnectLikeConnectProgress(progress, exception)) {
                if (exception) {
                    this.emit('accountError', {
                        accountId,
                        sessionId,
                        message: exception,
                        source: 'connectProgress',
                    });
                }
                this.emit('accountDisconnected', {
                    accountId,
                    sessionId,
                    reason: exception ?? (progress || 'connectProgress disconnected'),
                    source: 'connectProgress',
                });
            }
        });
        this.ws.on('disconnected', (data, sessionId) => {
            const accountId = this.sessionToAccount.get(sessionId);
            if (accountId !== undefined) {
                console.warn('[MT5 WS] disconnected', {
                    accountId,
                    sessionId,
                    reason: data.reason ?? 'unknown',
                });
                writeQuickReconnectLog('mt5.disconnected', {
                    accountId,
                    sessionId,
                    reason: data.reason ?? 'unknown',
                });
                this.emit('accountDisconnected', {
                    accountId,
                    sessionId,
                    reason: data.reason ?? 'MT5 session disconnected',
                    source: 'disconnected',
                });
            }
        });
        this.ws.on('error', (err, sessionId) => {
            const accountId = this.sessionToAccount.get(sessionId);
            if (accountId !== undefined) {
                console.error('[MT5 WS] error', {
                    accountId,
                    sessionId,
                    message: err.message,
                });
                writeQuickReconnectLog('mt5.error', {
                    accountId,
                    sessionId,
                    message: err.message,
                });
                this.emit('accountError', {
                    accountId,
                    sessionId,
                    message: err.message,
                    source: 'error',
                });
            }
        });
        this.ws.on('sessionRemoved', (data) => {
            const accountId = this.sessionToAccount.get(data.sessionId);
            if (accountId !== undefined) {
                this.sessionToAccount.delete(data.sessionId);
                console.warn('[MT5 WS] sessionRemoved', {
                    accountId,
                    sessionId: data.sessionId,
                });
                writeQuickReconnectLog('mt5.sessionRemoved', {
                    accountId,
                    sessionId: data.sessionId,
                });
                this.emit('accountDisconnected', {
                    accountId,
                    sessionId: data.sessionId,
                    reason: 'MT5 session removed',
                    source: 'sessionRemoved',
                });
            }
            if (this.sessionToAccount.size === 0) {
                this.closeWs();
            }
        });
        this.ws.connect();
    }
    closeWs() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
function normalizeMtApiQuoteTime(value) {
    if (!value)
        return new Date().toISOString();
    const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
    const timestamp = Date.parse(normalized);
    return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
}
function isDisconnectLikeConnectProgress(progress, exception) {
    const normalized = progress.trim().toLowerCase();
    return normalized === 'disconnect'
        || normalized === 'disconnected'
        || normalized === 'exception'
        || exception !== null;
}
function normalizeConnectProgress(data) {
    if (typeof data.progress === 'string' && data.progress.trim()) {
        return data.progress.trim();
    }
    if (typeof data.event === 'string' && data.event.trim()) {
        return data.event.trim();
    }
    return '';
}
function normalizeExceptionMessage(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || null;
    }
    if (value && typeof value === 'object') {
        const message = 'message' in value && typeof value.message === 'string'
            ? value.message.trim()
            : '';
        if (message) {
            return message;
        }
        const serialized = safeJsonStringify(value);
        return serialized || 'Unknown MT5 connect exception';
    }
    return null;
}
function safeJsonStringify(value) {
    try {
        return JSON.stringify(value);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=mt5-source.js.map