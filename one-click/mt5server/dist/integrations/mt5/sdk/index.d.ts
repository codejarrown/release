import { HttpClient } from '../../../lib/http-client.js';
import { HealthApi } from './health.js';
import { SessionApi } from './session.js';
import { MarketApi } from './market.js';
import { SubscriptionsApi } from './subscriptions.js';
import { TradingApi } from './trading.js';
import { CalculationsApi } from './calculations.js';
import { HistoryApi } from './history.js';
import { MailApi } from './mail.js';
import { UtilitiesApi } from './utilities.js';
import { Mt5WsClient } from './websocket.js';
import type { Mt5WsClientOptions } from './websocket.js';
export interface Mt5ApiSdkOptions {
    /** WebSocket base URL, e.g. "ws://localhost:5050". If omitted, derived from HTTP baseUrl. */
    wsBaseUrl?: string;
}
export declare class Mt5ApiSdk {
    private readonly client;
    readonly health: HealthApi;
    readonly session: SessionApi;
    readonly market: MarketApi;
    readonly subscriptions: SubscriptionsApi;
    readonly trading: TradingApi;
    readonly calculations: CalculationsApi;
    readonly history: HistoryApi;
    readonly mail: MailApi;
    readonly utilities: UtilitiesApi;
    private readonly wsBaseUrl;
    constructor(client: HttpClient, options?: Mt5ApiSdkOptions);
    /**
     * Create a global WebSocket client that connects to `/api/ws`.
     * All sessions share this single connection; events carry `sessionId` to identify the source.
     */
    createWsClient(opts?: Partial<Mt5WsClientOptions>): Mt5WsClient;
    /**
     * Create a session-bound client for REST API calls that require a sessionId.
     */
    createSessionClient(sessionId: string): Mt5SessionClient;
}
/**
 * Session-bound client — all REST API modules that require sessionId are pre-bound.
 * WebSocket is no longer per-session; use `Mt5ApiSdk.createWsClient()` instead.
 */
export declare class Mt5SessionClient {
    readonly sessionId: string;
    readonly market: MarketApi;
    readonly subscriptions: SubscriptionsApi;
    readonly trading: TradingApi;
    readonly calculations: CalculationsApi;
    readonly history: HistoryApi;
    readonly mail: MailApi;
    constructor(client: HttpClient, sessionId: string);
}
export { Mt5ApiSdk as default };
export { Mt5WsClient } from './websocket.js';
export type { Mt5WsClientOptions, Mt5WsEventType, Mt5WsSessionEventType, Mt5WsSystemEventType, Mt5WsEventMap, Mt5WsSessionEventMap, Mt5WsSystemEventMap, Mt5WsMessage, WsConnectedEvent, WsDisconnectedEvent, WsErrorEvent, WsConnectProgressEvent, WsWelcomeEvent, WsSessionCreatedEvent, WsSessionRemovedEvent, WsSymbolsUpdateEvent, } from './websocket.js';
export type * from './types.js';
//# sourceMappingURL=index.d.ts.map