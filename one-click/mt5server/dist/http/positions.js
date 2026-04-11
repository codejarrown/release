import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { idParam, errorResponse } from './schema-helper.js';
const listQuery = z.object({
    sort: z.string().optional(),
    ascending: z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional(),
});
const accountIdParam = idParam('accountId', 'Account ID');
export function registerPositionRoutes(app, accountService, mt5Sdk) {
    app.get('/api/v1/accounts/:accountId/positions', {
        schema: {
            tags: ['Positions'],
            summary: '当前持仓列表',
            params: accountIdParam,
            querystring: {
                type: 'object',
                properties: {
                    sort: { type: 'string', description: '排序字段' },
                    ascending: { type: 'string', enum: ['true', 'false'] },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { type: 'object', additionalProperties: true },
                        },
                    },
                },
                409: errorResponse,
            },
        },
    }, async (request) => {
        const sessionId = await accountService.resolveSessionId(parseId(request.params.accountId));
        const query = listQuery.safeParse(request.query);
        const opts = query.success ? query.data : {};
        const orders = await mt5Sdk.trading.getOpenedOrders({
            sort: opts.sort,
            ascending: opts.ascending,
            sessionId,
        });
        return { data: orders };
    });
    app.get('/api/v1/accounts/:accountId/positions/:ticket', {
        schema: {
            tags: ['Positions'],
            summary: '单笔持仓详情',
            params: {
                type: 'object',
                required: ['accountId', 'ticket'],
                properties: {
                    accountId: { type: 'integer', minimum: 1 },
                    ticket: { type: 'integer', minimum: 1, description: 'Order ticket' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: { type: 'object', additionalProperties: true },
                    },
                },
                409: errorResponse,
            },
        },
    }, async (request) => {
        const sessionId = await accountService.resolveSessionId(parseId(request.params.accountId));
        const ticket = Number(request.params.ticket);
        if (!Number.isInteger(ticket) || ticket <= 0) {
            throw new ValidationError('Invalid ticket');
        }
        const order = await mt5Sdk.trading.getOpenedOrder(ticket, sessionId);
        return { data: order };
    });
    app.get('/api/v1/accounts/:accountId/positions/closed', {
        schema: {
            tags: ['Positions'],
            summary: '已平仓列表',
            params: accountIdParam,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { type: 'object', additionalProperties: true },
                        },
                    },
                },
                409: errorResponse,
            },
        },
    }, async (request) => {
        const sessionId = await accountService.resolveSessionId(parseId(request.params.accountId));
        const orders = await mt5Sdk.trading.getClosedOrders(sessionId);
        console.log('ordersOrder', orders);
        return { data: orders };
    });
}
function parseId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('Invalid account id');
    }
    return id;
}
//# sourceMappingURL=positions.js.map