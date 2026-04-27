import { describe, it, expect, vi } from 'vitest';
import { TradingApi } from './trading.js';
import { HttpClientError } from '../../../lib/errors.js';
function createMockClient(responses) {
    const handler = async (method, path) => {
        const key = `${method} ${path}`;
        const match = responses[key];
        if (!match)
            throw new Error(`No mock for ${key}`);
        return {
            statusCode: match.statusCode ?? 200,
            headers: { 'content-type': 'application/json' },
            body: match.body,
        };
    };
    return {
        get: vi.fn(async (path) => handler('GET', path)),
        post: vi.fn(async (path) => handler('POST', path)),
        put: vi.fn(async (path) => handler('PUT', path)),
        delete: vi.fn(async (path) => handler('DELETE', path)),
    };
}
const mockOrder = {
    ticket: 12345,
    symbol: 'EURUSD',
    orderType: 'Buy',
    lots: 0.1,
    openPrice: 1.0856,
    profit: 15.5,
};
describe('TradingApi', () => {
    it('orderSend returns the created order', async () => {
        const client = createMockClient({
            'POST /api/sess-1/trading/orders/send': { body: mockOrder },
        });
        const api = new TradingApi(client, 'sess-1');
        const order = await api.orderSend({
            symbol: 'EURUSD',
            lots: 0.1,
            price: 1.0856,
            type: 'Buy',
        });
        expect(order.ticket).toBe(12345);
        expect(order.symbol).toBe('EURUSD');
        expect(order.lots).toBe(0.1);
    });
    it('orderClose returns the closed order', async () => {
        const closedOrder = { ...mockOrder, closePrice: 1.088, profit: 24.0 };
        const client = createMockClient({
            'POST /api/sess-1/trading/orders/close': { body: closedOrder },
        });
        const api = new TradingApi(client, 'sess-1');
        const order = await api.orderClose({
            ticket: 12345,
            symbol: 'EURUSD',
            price: 1.088,
            lots: 0.1,
            type: 'Sell',
        });
        expect(order.closePrice).toBe(1.088);
        expect(order.profit).toBe(24.0);
    });
    it('orderModify returns success', async () => {
        const client = createMockClient({
            'POST /api/sess-1/trading/orders/modify': { body: { success: true } },
        });
        const api = new TradingApi(client, 'sess-1');
        const result = await api.orderModify({
            ticket: 12345,
            symbol: 'EURUSD',
            lots: 0.1,
            price: 1.0856,
            type: 'Buy',
            sl: 1.08,
            tp: 1.10,
        });
        expect(result.success).toBe(true);
    });
    it('getOpenedOrders returns orders array', async () => {
        const client = createMockClient({
            'GET /api/sess-1/trading/orders/opened': { body: [mockOrder] },
        });
        const api = new TradingApi(client, 'sess-1');
        const orders = await api.getOpenedOrders();
        expect(orders).toHaveLength(1);
        expect(orders[0].ticket).toBe(12345);
    });
    it('getOpenedOrder returns a single order', async () => {
        const client = createMockClient({
            'GET /api/sess-1/trading/orders/opened/12345': { body: mockOrder },
        });
        const api = new TradingApi(client, 'sess-1');
        const order = await api.getOpenedOrder(12345);
        expect(order.ticket).toBe(12345);
    });
    it('getClosedOrders returns orders array', async () => {
        const closedOrder = { ...mockOrder, closePrice: 1.088 };
        const client = createMockClient({
            'GET /api/sess-1/trading/orders/closed': { body: [closedOrder] },
        });
        const api = new TradingApi(client, 'sess-1');
        const orders = await api.getClosedOrders();
        expect(orders).toHaveLength(1);
        expect(orders[0].closePrice).toBe(1.088);
    });
    it('throws HttpClientError on order send failure', async () => {
        const client = {
            post: vi.fn(async () => {
                throw new HttpClientError('Order rejected', 500, 'internal_error', {
                    error: 'internal_error',
                    message: 'Order rejected by server',
                });
            }),
            get: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
        };
        const api = new TradingApi(client, 'sess-1');
        await expect(api.orderSend({
            symbol: 'EURUSD',
            lots: 0.1,
            price: 1.0856,
            type: 'Buy',
        })).rejects.toThrow(HttpClientError);
    });
    it('throws when sessionId is missing', async () => {
        const client = createMockClient({});
        const api = new TradingApi(client);
        await expect(api.orderSend({
            symbol: 'EURUSD',
            lots: 0.1,
            price: 1.0856,
            type: 'Buy',
        })).rejects.toThrow('sessionId is required');
    });
});
//# sourceMappingURL=trading.test.js.map