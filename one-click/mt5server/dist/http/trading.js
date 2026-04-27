import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { RequestIdempotencyCache, resolveIdempotencyKey } from '../lib/request-idempotency.js';
import { zToSchema, idParam, errorResponse } from './schema-helper.js';
const orderSendBody = z.object({
    symbol: z.string().min(1),
    lots: z.number().positive(),
    price: z.number(),
    type: z.number().int().describe('OrderType: 0=Buy, 1=Sell, 2=BuyLimit, 3=SellLimit, 4=BuyStop, 5=SellStop'),
    sl: z.number().default(0),
    tp: z.number().default(0),
    comment: z.string().optional(),
    magic: z.number().int().optional(),
    expiration: z
        .object({
        type: z.number().int(),
        dateTime: z.number().int().optional(),
    })
        .optional(),
    requestId: z.string().min(1).max(200).optional(),
});
const orderCloseBody = z.object({
    ticket: z.number().int().describe('要平仓的订单 ticket'),
    symbol: z.string().min(1),
    price: z.number(),
    lots: z.number().positive(),
    type: z.number().int(),
    deviation: z.number().int().optional(),
    requestId: z.string().min(1).max(200).optional(),
});
const orderModifyBody = z.object({
    ticket: z.number().int(),
    symbol: z.string().min(1),
    lots: z.number().positive(),
    price: z.number(),
    type: z.number().int(),
    sl: z.number(),
    tp: z.number(),
    magic: z.number().int().optional(),
    expiration: z
        .object({
        type: z.number().int(),
        dateTime: z.number().int().optional(),
    })
        .optional(),
});
const accountIdParam = idParam('accountId', 'Account ID');
const tradingIdempotency = new RequestIdempotencyCache();
export function registerTradingRoutes(app, accountService, mt5Sdk) {
    app.post('/api/v1/accounts/:accountId/trade/order', {
        schema: {
            tags: ['Trading'],
            summary: '下单（做多/做空/挂单）',
            description: 'type 字段决定方向：0=Buy（多），1=Sell（空），以及挂单类型',
            params: accountIdParam,
            body: zToSchema(orderSendBody),
            headers: {
                type: 'object',
                properties: {
                    'x-idempotency-key': { type: 'string', description: '幂等键；也可通过 body.requestId 传入' },
                },
            },
            response: {
                200: { type: 'object', properties: { data: { type: 'object' } } },
                400: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const accountId = parseId(request.params.accountId);
        const sessionId = await accountService.resolveSessionId(accountId);
        const parsed = orderSendBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid order body', parsed.error.flatten().fieldErrors);
        }
        const requestId = resolveIdempotencyKey(request.headers, parsed.data.requestId);
        const payload = { accountId, ...parsed.data };
        const { requestId: _requestId, ...sdkPayload } = parsed.data;
        const order = await tradingIdempotency.execute(`trade-order:${accountId}`, requestId, payload, async () => mt5Sdk.trading.orderSend(sdkPayload, sessionId));
        return { data: order };
    });
    app.post('/api/v1/accounts/:accountId/trade/close', {
        schema: {
            tags: ['Trading'],
            summary: '平仓',
            params: accountIdParam,
            body: zToSchema(orderCloseBody),
            headers: {
                type: 'object',
                properties: {
                    'x-idempotency-key': { type: 'string', description: '幂等键；也可通过 body.requestId 传入' },
                },
            },
            response: {
                200: { type: 'object', properties: { data: { type: 'object' } } },
                400: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const accountId = parseId(request.params.accountId);
        const sessionId = await accountService.resolveSessionId(accountId);
        const parsed = orderCloseBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid close body', parsed.error.flatten().fieldErrors);
        }
        const requestId = resolveIdempotencyKey(request.headers, parsed.data.requestId);
        const payload = { accountId, ...parsed.data };
        const { requestId: _requestId, ...sdkPayload } = parsed.data;
        const order = await tradingIdempotency.execute(`trade-close:${accountId}`, requestId, payload, async () => mt5Sdk.trading.orderClose(sdkPayload, sessionId));
        return { data: order };
    });
    app.post('/api/v1/accounts/:accountId/trade/modify', {
        schema: {
            tags: ['Trading'],
            summary: '改单',
            params: accountIdParam,
            body: zToSchema(orderModifyBody),
            response: {
                200: { type: 'object', properties: { data: { type: 'object' } } },
                400: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const sessionId = await accountService.resolveSessionId(parseId(request.params.accountId));
        const parsed = orderModifyBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid modify body', parsed.error.flatten().fieldErrors);
        }
        const result = await mt5Sdk.trading.orderModify(parsed.data, sessionId);
        return { data: result };
    });
}
function parseId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('Invalid account id');
    }
    return id;
}
//# sourceMappingURL=trading.js.map