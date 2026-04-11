import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerOrderGroupRoutes } from './order-groups.js';
describe('registerOrderGroupRoutes idempotency', () => {
    it('deduplicates batch-open requests by requestId', async () => {
        const app = Fastify();
        const orderGroupService = {
            batchOpen: vi.fn(async () => ({ id: 1, items: [] })),
        };
        registerOrderGroupRoutes(app, orderGroupService);
        const payload = {
            orders: [
                {
                    accountId: 1,
                    symbol: 'EURUSD',
                    type: 0,
                    lots: 0.1,
                },
            ],
            requestId: 'req-batch-open-1',
        };
        const [first, second] = await Promise.all([
            app.inject({ method: 'POST', url: '/api/v1/order-groups/1/batch-open', payload }),
            app.inject({ method: 'POST', url: '/api/v1/order-groups/1/batch-open', payload }),
        ]);
        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);
        expect(orderGroupService.batchOpen).toHaveBeenCalledTimes(1);
        await app.close();
    });
    it('deduplicates batch-close-many requests by idempotency header', async () => {
        const app = Fastify();
        const orderGroupService = {
            batchCloseMany: vi.fn(async () => ([])),
        };
        registerOrderGroupRoutes(app, orderGroupService);
        const request = {
            method: 'POST',
            url: '/api/v1/order-groups/batch-close-many',
            headers: { 'x-idempotency-key': 'req-batch-close-many-1' },
            payload: { groupIds: [1, 2] },
        };
        const [first, second] = await Promise.all([app.inject(request), app.inject(request)]);
        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);
        expect(orderGroupService.batchCloseMany).toHaveBeenCalledTimes(1);
        await app.close();
    });
});
//# sourceMappingURL=order-groups-idempotency.test.js.map