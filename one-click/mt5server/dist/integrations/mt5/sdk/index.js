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
export class Mt5ApiSdk {
    client;
    health;
    session;
    market;
    subscriptions;
    trading;
    calculations;
    history;
    mail;
    utilities;
    wsBaseUrl;
    constructor(client, options) {
        this.client = client;
        this.health = new HealthApi(client);
        this.session = new SessionApi(client);
        this.market = new MarketApi(client);
        this.subscriptions = new SubscriptionsApi(client);
        this.trading = new TradingApi(client);
        this.calculations = new CalculationsApi(client);
        this.history = new HistoryApi(client);
        this.mail = new MailApi(client);
        this.utilities = new UtilitiesApi(client);
        this.wsBaseUrl = options?.wsBaseUrl;
    }
    /**
     * Create a global WebSocket client that connects to `/api/ws`.
     * All sessions share this single connection; events carry `sessionId` to identify the source.
     */
    createWsClient(opts) {
        const baseUrl = opts?.baseUrl ?? this.wsBaseUrl;
        if (!baseUrl) {
            throw new Error('WebSocket baseUrl is required. Pass wsBaseUrl when creating the SDK, or provide baseUrl in createWsClient options.');
        }
        return new Mt5WsClient({
            baseUrl,
            autoReconnect: opts?.autoReconnect,
            reconnectDelay: opts?.reconnectDelay,
            maxReconnectAttempts: opts?.maxReconnectAttempts,
        });
    }
    /**
     * Create a session-bound client for REST API calls that require a sessionId.
     */
    createSessionClient(sessionId) {
        return new Mt5SessionClient(this.client, sessionId);
    }
}
/**
 * Session-bound client — all REST API modules that require sessionId are pre-bound.
 * WebSocket is no longer per-session; use `Mt5ApiSdk.createWsClient()` instead.
 */
export class Mt5SessionClient {
    sessionId;
    market;
    subscriptions;
    trading;
    calculations;
    history;
    mail;
    constructor(client, sessionId) {
        this.sessionId = sessionId;
        this.market = new MarketApi(client, sessionId);
        this.subscriptions = new SubscriptionsApi(client, sessionId);
        this.trading = new TradingApi(client, sessionId);
        this.calculations = new CalculationsApi(client, sessionId);
        this.history = new HistoryApi(client, sessionId);
        this.mail = new MailApi(client, sessionId);
    }
}
export { Mt5ApiSdk as default };
export { Mt5WsClient } from './websocket.js';
//# sourceMappingURL=index.js.map