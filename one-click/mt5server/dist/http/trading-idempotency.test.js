import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerTradingRoutes } from './trading.js';
describe('registerTradingRoutes idempotency', () => {
    it('deduplicates orderSend by requestId', async () => {
        const app = Fastify();
        const accountService = {
            resolveSessionId: vi.fn(async () => 'sess-1'),
        };
        const mt5Sdk = {
            trading: {
                orderSend: vi.fn(async () => ({ ticket: 12345 })),
                orderClose: vi.fn(),
                orderModify: vi.fn(),
            },
        };
        registerTradingRoutes(app, accountService, mt5Sdk);
        const payload = {
            symbol: 'EURUSD',
            lots: 0.1,
            price: 1.1,
            type: 0,
            sl: 0,
            tp: 0,
            requestId: 'req-open-1',
        };
        const [first, second] = await Promise.all([
            app.inject({ method: 'POST', url: '/api/v1/accounts/1/trade/order', payload }),
            app.inject({ method: 'POST', url: '/api/v1/accounts/1/trade/order', payload }),
        ]);
        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);
        expect(mt5Sdk.trading.orderSend).toHaveBeenCalledTimes(1);
        await app.close();
    });
    it('deduplicates orderClose by X-Idempotency-Key', async () => {
        const app = Fastify();
        const accountService = {
            resolveSessionId: vi.fn(async () => 'sess-1'),
        };
        const mt5Sdk = {
            trading: {
                orderSend: vi.fn(),
                orderClose: vi.fn(async () => ({ ticket: 12345, profit: 1.2 })),
                orderModify: vi.fn(),
            },
        };
        registerTradingRoutes(app, accountService, mt5Sdk);
        const request = {
            method: 'POST',
            url: '/api/v1/accounts/1/trade/close',
            headers: { 'x-idempotency-key': 'req-close-1' },
            payload: {
                ticket: 12345,
                symbol: 'EURUSD',
                price: 1.1,
                lots: 0.1,
                type: 1,
            },
        };
        const [first, second] = await Promise.all([app.inject(request), app.inject(request)]);
        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);
        expect(mt5Sdk.trading.orderClose).toHaveBeenCalledTimes(1);
        await app.close();
    });
});
//# sourceMappingURL=trading-idempotency.test.js.map