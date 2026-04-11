import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Mt5WsClient } from './websocket.js';
class MockWebSocket {
    url;
    static OPEN = 1;
    static CLOSED = 3;
    readyState = MockWebSocket.OPEN;
    listeners = {};
    constructor(url) {
        this.url = url;
        setTimeout(() => this.fireEvent('open', {}), 0);
    }
    addEventListener(event, handler) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(handler);
    }
    close() {
        this.readyState = MockWebSocket.CLOSED;
        this.fireEvent('close', { code: 1000, reason: 'normal' });
    }
    fireEvent(event, data) {
        for (const handler of this.listeners[event] || []) {
            handler(data);
        }
    }
    simulateMessage(data) {
        this.fireEvent('message', { data: JSON.stringify(data) });
    }
}
let mockInstances = [];
describe('Mt5WsClient', () => {
    beforeEach(() => {
        mockInstances = [];
        vi.stubGlobal('WebSocket', class extends MockWebSocket {
            constructor(url) {
                super(url);
                mockInstances.push(this);
            }
        });
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('connects to global /api/ws endpoint', () => {
        const client = new Mt5WsClient({
            baseUrl: 'ws://localhost:5050',
            autoReconnect: false,
        });
        client.connect();
        expect(mockInstances[0].url).toBe('ws://localhost:5050/api/ws');
        client.close();
    });
    it('emits ws:open on connection', async () => {
        const client = new Mt5WsClient({
            baseUrl: 'ws://localhost:5050',
            autoReconnect: false,
        });
        const openHandler = vi.fn();
        client.on('ws:open', openHandler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        expect(openHandler).toHaveBeenCalledOnce();
        client.close();
    });
    // --- System events (no sessionId) ---
    it('emits welcome system event', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('welcome', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'welcome',
            data: { message: 'connected', timestamp: '2026-03-05T12:00:00Z' },
        });
        expect(handler).toHaveBeenCalledOnce();
        const data = handler.mock.calls[0][0];
        expect(data.message).toBe('connected');
        // system events have no second sessionId arg
        expect(handler.mock.calls[0]).toHaveLength(1);
        client.close();
    });
    it('emits sessionCreated system event', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('sessionCreated', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'sessionCreated',
            data: { sessionId: 'abc123', user: 12345678, connected: true, timestamp: '2026-03-05T12:00:00Z' },
        });
        expect(handler).toHaveBeenCalledOnce();
        const data = handler.mock.calls[0][0];
        expect(data.sessionId).toBe('abc123');
        expect(data.user).toBe(12345678);
        client.close();
    });
    it('emits sessionRemoved system event', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('sessionRemoved', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'sessionRemoved',
            data: { sessionId: 'abc123', timestamp: '2026-03-05T12:05:00Z' },
        });
        expect(handler).toHaveBeenCalledOnce();
        const data = handler.mock.calls[0][0];
        expect(data.sessionId).toBe('abc123');
        client.close();
    });
    // --- Session-scoped events (with sessionId) ---
    it('emits quote event with sessionId', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('quote', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'quote',
            sessionId: 'sess-1',
            data: { symbol: 'EURUSD', bid: 1.0856, ask: 1.0858, time: '2026-03-05T12:00:00' },
        });
        expect(handler).toHaveBeenCalledOnce();
        const data = handler.mock.calls[0][0];
        expect(data.symbol).toBe('EURUSD');
        expect(data.bid).toBe(1.0856);
        expect(handler.mock.calls[0][1]).toBe('sess-1');
        client.close();
    });
    it('emits connectProgress with sessionId', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('connectProgress', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'connectProgress',
            sessionId: 'abc123',
            data: { progress: 'Connected', exception: null },
        });
        expect(handler).toHaveBeenCalledOnce();
        expect(handler.mock.calls[0][1]).toBe('abc123');
        client.close();
    });
    it('emits disconnected event with sessionId', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('disconnected', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'disconnected',
            sessionId: 'sess-1',
            data: { reason: 'mt5_session_lost', timestamp: '2026-03-05T12:05:00Z' },
        });
        expect(handler).toHaveBeenCalledOnce();
        const data = handler.mock.calls[0][0];
        expect(data.reason).toBe('mt5_session_lost');
        expect(handler.mock.calls[0][1]).toBe('sess-1');
        client.close();
    });
    it('emits error event with sessionId', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('error', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'error',
            sessionId: 'sess-1',
            data: { message: 'something failed', timestamp: '2026-03-05T12:05:00Z' },
        });
        expect(handler).toHaveBeenCalledOnce();
        expect(handler.mock.calls[0][1]).toBe('sess-1');
        client.close();
    });
    it('emits orderUpdate event with sessionId', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('orderUpdate', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'orderUpdate',
            sessionId: 'sess-1',
            data: { ticket: 12345, symbol: 'EURUSD', orderType: 'Buy', lots: 0.1 },
        });
        expect(handler).toHaveBeenCalledOnce();
        const data = handler.mock.calls[0][0];
        expect(data.ticket).toBe(12345);
        expect(handler.mock.calls[0][1]).toBe('sess-1');
        client.close();
    });
    it('emits symbolsUpdate event with sessionId', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('symbolsUpdate', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'symbolsUpdate',
            sessionId: 'sess-1',
            data: { timestamp: '2026-03-05T12:00:00Z' },
        });
        expect(handler).toHaveBeenCalledOnce();
        const data = handler.mock.calls[0][0];
        expect(data.timestamp).toBe('2026-03-05T12:00:00Z');
        expect(handler.mock.calls[0][1]).toBe('sess-1');
        client.close();
    });
    it('emits mail event with sessionId', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('mail', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].simulateMessage({
            type: 'mail',
            sessionId: 'sess-1',
            data: { id: 1, time: '2026-03-05', subject: 'Hello' },
        });
        expect(handler).toHaveBeenCalledOnce();
        expect(handler.mock.calls[0][1]).toBe('sess-1');
        client.close();
    });
    // --- Edge cases ---
    it('ignores malformed JSON', async () => {
        const client = new Mt5WsClient({ baseUrl: 'ws://localhost:5050', autoReconnect: false });
        const handler = vi.fn();
        client.on('quote', handler);
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        mockInstances[0].fireEvent('message', { data: 'not json{{{' });
        expect(handler).not.toHaveBeenCalled();
        client.close();
    });
    it('close() prevents reconnection', async () => {
        const client = new Mt5WsClient({
            baseUrl: 'ws://localhost:5050',
            autoReconnect: true,
            reconnectDelay: 10,
        });
        client.connect();
        await new Promise((r) => setTimeout(r, 10));
        client.close();
        await new Promise((r) => setTimeout(r, 50));
        expect(mockInstances).toHaveLength(1);
    });
});
//# sourceMappingURL=websocket.test.js.map