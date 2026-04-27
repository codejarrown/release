import { EventEmitter } from 'node:events';
import type { Mt5ApiSdk } from '../integrations/mt5/sdk/index.js';
import type { Order } from '../integrations/mt5/sdk/types.js';
export interface DownstreamQuote {
    accountId: number;
    sessionId: string;
    symbol: string;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    time: string;
}
export interface DownstreamOrderUpdate {
    accountId: number;
    sessionId: string;
    order: Order;
}
export interface DownstreamOrderUpdateSnapshot {
    accountId: number;
    sessionId: string;
    data: Order[];
}
export interface DownstreamAccountDisconnected {
    accountId: number;
    sessionId: string | null;
    reason: string;
    source: 'disconnected' | 'connectProgress' | 'sessionRemoved';
}
export interface DownstreamAccountError {
    accountId: number;
    sessionId: string | null;
    message: string;
    source: 'error' | 'connectProgress';
}
export interface DownstreamConnectProgress {
    accountId: number;
    sessionId: string;
    progress: string;
    exception: string | null;
}
/**
 * Manages a **single** upstream MT5 WebSocket connection (global `/api/ws`).
 *
 * Maintains a sessionId → accountId mapping so that incoming session-scoped
 * events can be attributed to the correct local account.
 */
export declare class WsConnectionManager extends EventEmitter {
    private readonly mt5Sdk;
    private readonly wsBaseUrl;
    private ws;
    private readonly sessionToAccount;
    constructor(mt5Sdk: Mt5ApiSdk, wsBaseUrl: string);
    addSession(accountId: number, sessionId: string): void;
    removeSession(accountId: number): void;
    subscribeSymbols(accountId: number, symbols: string[], sessionId: string): Promise<void>;
    getActiveAccountIds(): number[];
    getAccountIdBySession(sessionId: string): number | undefined;
    listActiveSessions(): Array<{
        accountId: number;
        sessionId: string;
    }>;
    closeAll(): void;
    private ensureConnected;
    private closeWs;
}
//# sourceMappingURL=mt5-source.d.ts.map