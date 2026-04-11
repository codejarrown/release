import { EventEmitter } from 'node:events';
const SYSTEM_EVENTS = new Set([
    'welcome',
    'sessionCreated',
    'sessionRemoved',
]);
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
export class Mt5WsClient extends EventEmitter {
    options;
    ws = null;
    url;
    autoReconnect;
    reconnectDelay;
    maxReconnectAttempts;
    reconnectAttempts = 0;
    reconnectTimer = null;
    _closed = false;
    constructor(options) {
        super();
        this.options = options;
        const base = options.baseUrl.replace(/\/+$/, '');
        this.url = `${base}/api/ws`;
        this.autoReconnect = options.autoReconnect ?? true;
        this.reconnectDelay = options.reconnectDelay ?? 3000;
        this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;
    }
    get connected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
    connect() {
        this._closed = false;
        this.reconnectAttempts = 0;
        this.createConnection();
    }
    close() {
        this._closed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    createConnection() {
        this.ws = new WebSocket(this.url);
        this.ws.addEventListener('open', () => {
            this.reconnectAttempts = 0;
            this.emit('ws:open');
        });
        this.ws.addEventListener('message', (event) => {
            this.handleMessage(typeof event.data === 'string' ? event.data : String(event.data));
        });
        this.ws.addEventListener('close', (event) => {
            this.emit('ws:close', event.code, event.reason);
            this.ws = null;
            this.maybeReconnect();
        });
        this.ws.addEventListener('error', () => {
            // error events are typically followed by close
        });
    }
    handleMessage(raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        }
        catch {
            return;
        }
        if (!msg.type)
            return;
        if (SYSTEM_EVENTS.has(msg.type)) {
            this.emit(msg.type, msg.data);
        }
        else {
            this.emit(msg.type, msg.data, msg.sessionId);
        }
    }
    maybeReconnect() {
        if (this._closed || !this.autoReconnect)
            return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts)
            return;
        this.reconnectAttempts++;
        this.emit('ws:reconnecting', this.reconnectAttempts);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.createConnection();
        }, this.reconnectDelay);
    }
}
//# sourceMappingURL=websocket.js.map