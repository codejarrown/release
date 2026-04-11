import { EventEmitter } from 'node:events';
import type { Quote, Order, OrderHistoryEventArgs, Bar, MailMessage } from './types.js';
/** Session-scoped event types — messages carry a top-level `sessionId`. */
export type Mt5WsSessionEventType = 'connected' | 'disconnected' | 'error' | 'connectProgress' | 'quote' | 'quoteHistory' | 'tickHistory' | 'orderBook' | 'orderUpdate' | 'orderProgress' | 'orderHistory' | 'symbolUpdate' | 'symbolsUpdate' | 'mail' | 'orderUpdateSnapshot';
/** System-level event types — no `sessionId`. */
export type Mt5WsSystemEventType = 'welcome' | 'sessionCreated' | 'sessionRemoved';
export type Mt5WsEventType = Mt5WsSessionEventType | Mt5WsSystemEventType;
export interface WsWelcomeEvent {
    message: string;
    timestamp: string;
}
export interface WsSessionCreatedEvent {
    sessionId: string;
    user: number;
    connected: boolean;
    timestamp: string;
}
export interface WsSessionRemovedEvent {
    sessionId: string;
    timestamp: string;
}
export interface WsConnectedEvent {
    sessionId: string;
    connectedAt: string;
    server: string;
}
export interface WsDisconnectedEvent {
    reason: string;
    timestamp: string;
}
export interface WsErrorEvent {
    message: string;
    timestamp: string;
}
export interface WsConnectProgressEvent {
    progress: string;
    exception: string | null;
}
export interface WsSymbolsUpdateEvent {
    timestamp: string;
}
/** System events — emitted with just `(data)`. */
export interface Mt5WsSystemEventMap {
    welcome: WsWelcomeEvent;
    sessionCreated: WsSessionCreatedEvent;
    sessionRemoved: WsSessionRemovedEvent;
}
/** Session-scoped events — emitted with `(data, sessionId)`. */
export interface Mt5WsSessionEventMap {
    connected: WsConnectedEvent;
    disconnected: WsDisconnectedEvent;
    error: WsErrorEvent;
    connectProgress: WsConnectProgressEvent;
    quote: Quote;
    quoteHistory: Bar[];
    tickHistory: unknown;
    orderBook: unknown;
    orderUpdate: Order;
    orderUpdateSnapshot: Order[];
    orderProgress: unknown;
    orderHistory: OrderHistoryEventArgs;
    symbolUpdate: unknown;
    symbolsUpdate: WsSymbolsUpdateEvent;
    mail: MailMessage;
}
export type Mt5WsEventMap = Mt5WsSystemEventMap & Mt5WsSessionEventMap;
export interface Mt5WsMessage<T = unknown> {
    type: Mt5WsEventType;
    sessionId?: string;
    data: T;
}
export interface Mt5WsClientOptions {
    /** e.g. "ws://localhost:5050" */
    baseUrl: string;
    autoReconnect?: boolean;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
}
/**
 * MT5 WebSocket client — connects to the global `/api/ws` endpoint.
 *
 * All sessions share one connection. Session-scoped events carry `sessionId`
 * at the top level of the message.
 *
 * Usage:
 * ```ts
 * const ws = new Mt5WsClient({ baseUrl: 'ws://localhost:5050' });
 * ws.on('welcome', (data) => console.log(data.message));
 * ws.on('quote', (data, sessionId) => console.log(sessionId, data.symbol));
 * ws.connect();
 * ```
 */
export declare class Mt5WsClient extends EventEmitter {
    private readonly options;
    private ws;
    private readonly url;
    private readonly autoReconnect;
    private readonly reconnectDelay;
    private readonly maxReconnectAttempts;
    private reconnectAttempts;
    private reconnectTimer;
    private _closed;
    constructor(options: Mt5WsClientOptions);
    get connected(): boolean;
    connect(): void;
    close(): void;
    on<K extends keyof Mt5WsSystemEventMap>(event: K, listener: (data: Mt5WsSystemEventMap[K]) => void): this;
    on<K extends keyof Mt5WsSessionEventMap>(event: K, listener: (data: Mt5WsSessionEventMap[K], sessionId: string) => void): this;
    on(event: 'ws:open', listener: () => void): this;
    on(event: 'ws:close', listener: (code: number, reason: string) => void): this;
    on(event: 'ws:reconnecting', listener: (attempt: number) => void): this;
    private createConnection;
    private handleMessage;
    private maybeReconnect;
}
//# sourceMappingURL=websocket.d.ts.map