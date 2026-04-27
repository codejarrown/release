import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { RequestIdempotencyCache, resolveIdempotencyKey } from '../lib/request-idempotency.js';
import { zToSchema, idParam, errorResponse } from './schema-helper.js';
const createBody = z.object({
    name: z.string().min(1),
    accountGroupId: z.number().int().positive().optional(),
    remark: z.string().optional(),
});
const updateBody = z.object({
    name: z.string().min(1).optional(),
    accountGroupId: z.number().int().positive().nullable().optional(),
    remark: z.string().optional(),
});
const listQuery = z.object({
    accountGroupId: z.coerce.number().int().positive().optional(),
    isFullyClosed: z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional(),
    createdDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    createdDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
});
const summaryQuery = z.object({
    accountGroupId: z.coerce.number().int().positive().optional(),
    isFullyClosed: z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional(),
    createdDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    createdDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const batchOrderItem = z.object({
    accountId: z.number().int().positive(),
    symbol: z.string().min(1),
    type: z.number().int().describe('OrderType: 0=Buy, 1=Sell, 2=BuyLimit, 3=SellLimit, 4=BuyStop, 5=SellStop'),
    lots: z.number().positive(),
    price: z.number().optional(),
    sl: z.number().optional(),
    tp: z.number().optional(),
    comment: z.string().optional(),
});
const batchOpenBody = z.object({
    orders: z.array(batchOrderItem).min(1),
    requestId: z.string().min(1).max(200).optional(),
});
const batchCreateBody = z.object({
    name: z.string().min(1),
    accountGroupId: z.number().int().positive().optional(),
    remark: z.string().optional(),
    orders: z.array(batchOrderItem).min(1),
    requestId: z.string().min(1).max(200).optional(),
});
const batchCloseBody = z.object({
    tickets: z.array(z.number().int()).optional(),
    requestId: z.string().min(1).max(200).optional(),
    reverseOpen: z.boolean().optional(),
});
const deleteQuery = z.object({
    force: z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional(),
});
const orderGroupItemDto = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        accountId: { type: 'integer' },
        accountLogin: { type: 'integer' },
        accountLabel: { type: 'string', nullable: true },
        ticket: { type: 'integer', nullable: true },
        symbol: { type: 'string' },
        orderType: { type: 'string' },
        lots: { type: 'number' },
        openPrice: { type: 'number', nullable: true },
        closePrice: { type: 'number', nullable: true },
        profit: { type: 'number', nullable: true },
        sl: { type: 'number', nullable: true },
        tp: { type: 'number', nullable: true },
        status: { type: 'string', enum: ['pending', 'open', 'closed', 'failed'] },
        errorMessage: { type: 'string', nullable: true },
        openedAt: { type: 'string', nullable: true },
        closedAt: { type: 'string', nullable: true },
    },
};
const orderGroupDto = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        accountGroupId: { type: 'integer', nullable: true },
        accountGroupName: { type: 'string', nullable: true },
        isFullyClosed: { type: 'boolean' },
        remark: { type: 'string', nullable: true },
        openSpread: { type: 'number', nullable: true },
        closeSpread: { type: 'number', nullable: true },
        totalProfit: { type: 'number' },
        openCount: { type: 'integer' },
        closedCount: { type: 'integer' },
        itemCount: { type: 'integer' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        items: { type: 'array', items: orderGroupItemDto },
    },
};
const paginatedResponse = {
    type: 'object',
    properties: {
        data: { type: 'array', items: orderGroupDto },
        total: { type: 'integer' },
        page: { type: 'integer' },
        pageSize: { type: 'integer' },
    },
};
const summaryResponse = {
    type: 'object',
    properties: {
        data: {
            type: 'object',
            properties: {
                groupCount: { type: 'integer' },
                orderCount: { type: 'integer' },
                openOrderCount: { type: 'integer' },
                totalProfit: { type: 'number' },
                createdDateFrom: { type: 'string', nullable: true },
                createdDateTo: { type: 'string', nullable: true },
            },
        },
    },
};
const batchCloseManyBody = z.object({
    groupIds: z.array(z.number().int().positive()).min(1),
    requestId: z.string().min(1).max(200).optional(),
    reverseOpen: z.boolean().optional(),
});
const orderGroupIdempotency = new RequestIdempotencyCache();
export function registerOrderGroupRoutes(app, orderGroupService) {
    app.get('/api/v1/order-groups/summary', {
        schema: {
            tags: ['OrderGroups'],
            summary: '订单组汇总',
            description: '按筛选条件汇总订单组总盈亏、开单数量、未平仓数量等指标，适合仪表盘使用',
            querystring: {
                type: 'object',
                properties: {
                    accountGroupId: { type: 'integer', description: '按账号组筛选' },
                    isFullyClosed: { type: 'string', enum: ['true', 'false'], description: '按是否完全平仓筛选' },
                    createdDateFrom: { type: 'string', description: '开始日期，格式 YYYY-MM-DD' },
                    createdDateTo: { type: 'string', description: '结束日期，格式 YYYY-MM-DD' },
                },
            },
            response: {
                200: summaryResponse,
                400: errorResponse,
            },
        },
    }, async (request) => {
        const parsed = summaryQuery.safeParse(request.query);
        if (!parsed.success) {
            throw new ValidationError('Invalid query', parsed.error.flatten().fieldErrors);
        }
        const data = await orderGroupService.summary(parsed.data);
        return { data };
    });
    app.get('/api/v1/order-groups', {
        schema: {
            tags: ['OrderGroups'],
            summary: '订单组列表',
            description: '分页查询订单组，返回每组的订单明细',
            querystring: {
                type: 'object',
                properties: {
                    accountGroupId: { type: 'integer', description: '按账号组筛选' },
                    isFullyClosed: { type: 'string', enum: ['true', 'false'], description: '按是否完全平仓筛选' },
                    createdDateFrom: { type: 'string', description: '开始日期，格式 YYYY-MM-DD' },
                    createdDateTo: { type: 'string', description: '结束日期，格式 YYYY-MM-DD' },
                    page: { type: 'integer', minimum: 1, default: 1 },
                    pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                },
            },
            response: {
                200: paginatedResponse,
            },
        },
    }, async (request) => {
        const parsed = listQuery.safeParse(request.query);
        if (!parsed.success) {
            throw new ValidationError('Invalid query', parsed.error.flatten().fieldErrors);
        }
        return orderGroupService.list(parsed.data);
    });
    app.get('/api/v1/order-groups/:id', {
        schema: {
            tags: ['OrderGroups'],
            summary: '订单组详情',
            description: '返回订单组及其所有订单明细',
            params: idParam(),
            response: {
                200: { type: 'object', properties: { data: orderGroupDto } },
                404: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const group = await orderGroupService.getById(id);
        return { data: group };
    });
    app.post('/api/v1/order-groups', {
        schema: {
            tags: ['OrderGroups'],
            summary: '创建订单组',
            description: '创建一个空的订单组，后续可通过 batch-open 添加订单',
            body: zToSchema(createBody),
            response: {
                201: { type: 'object', properties: { data: orderGroupDto } },
                400: errorResponse,
            },
        },
    }, async (request, reply) => {
        const parsed = createBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const group = await orderGroupService.create(parsed.data);
        return reply.status(201).send({ data: group });
    });
    app.patch('/api/v1/order-groups/:id', {
        schema: {
            tags: ['OrderGroups'],
            summary: '更新订单组',
            description: '更新组名、备注、关联账号组（isFullyClosed 由系统自动维护）',
            params: idParam(),
            body: zToSchema(updateBody),
            response: {
                200: { type: 'object', properties: { data: orderGroupDto } },
                400: errorResponse,
                404: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const parsed = updateBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const group = await orderGroupService.update(id, parsed.data);
        return { data: group };
    });
    app.delete('/api/v1/order-groups/:id', {
        schema: {
            tags: ['OrderGroups'],
            summary: '删除订单组',
            description: '若组内有未平仓订单则拒绝（409），可传 ?force=true 强制删除',
            params: idParam(),
            querystring: {
                type: 'object',
                properties: {
                    force: { type: 'string', enum: ['true', 'false'], description: '强制删除' },
                },
            },
            response: {
                204: { type: 'null', description: '删除成功' },
                404: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request, reply) => {
        const id = parseId(request.params.id);
        const query = deleteQuery.safeParse(request.query);
        const force = query.success ? query.data.force === true : false;
        await orderGroupService.delete(id, force);
        return reply.status(204).send();
    });
    app.post('/api/v1/order-groups/:id/batch-open', {
        schema: {
            tags: ['OrderGroups'],
            summary: '批量下单（对冲开仓）',
            description: '向已有订单组批量下单，支持多账号、多方向。部分失败不回滚。',
            params: idParam(),
            body: zToSchema(batchOpenBody),
            headers: {
                type: 'object',
                properties: {
                    'x-idempotency-key': { type: 'string', description: '幂等键；也可通过 body.requestId 传入' },
                },
            },
            response: {
                200: { type: 'object', properties: { data: orderGroupDto } },
                400: errorResponse,
                404: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const parsed = batchOpenBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const requestId = resolveIdempotencyKey(request.headers, parsed.data.requestId);
        const payload = { groupId: id, ...parsed.data };
        const group = await orderGroupIdempotency.execute(`order-group-batch-open:${id}`, requestId, payload, async () => orderGroupService.batchOpen(id, parsed.data.orders));
        return { data: group };
    });
    app.post('/api/v1/order-groups/batch-create', {
        schema: {
            tags: ['OrderGroups'],
            summary: '创建订单组并批量开仓',
            description: '创建订单组 + 批量下单的快捷接口',
            body: zToSchema(batchCreateBody),
            headers: {
                type: 'object',
                properties: {
                    'x-idempotency-key': { type: 'string', description: '幂等键；也可通过 body.requestId 传入' },
                },
            },
            response: {
                201: { type: 'object', properties: { data: orderGroupDto } },
                400: errorResponse,
            },
        },
    }, async (request, reply) => {
        const parsed = batchCreateBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const requestId = resolveIdempotencyKey(request.headers, parsed.data.requestId);
        const payload = parsed.data;
        const { requestId: _requestId, ...servicePayload } = parsed.data;
        const group = await orderGroupIdempotency.execute('order-group-batch-create', requestId, payload, async () => orderGroupService.batchCreate(servicePayload));
        return reply.status(201).send({ data: group });
    });
    app.post('/api/v1/order-groups/:id/batch-close', {
        schema: {
            tags: ['OrderGroups'],
            summary: '批量平仓',
            description: '平仓组内所有或指定 ticket 的未平仓订单，平仓完毕后自动更新 isFullyClosed',
            params: idParam(),
            body: zToSchema(batchCloseBody),
            headers: {
                type: 'object',
                properties: {
                    'x-idempotency-key': { type: 'string', description: '幂等键；也可通过 body.requestId 传入' },
                },
            },
            response: {
                200: { type: 'object', properties: { data: orderGroupDto } },
                404: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const parsed = batchCloseBody.safeParse(request.body);
        const requestId = parsed.success
            ? resolveIdempotencyKey(request.headers, parsed.data.requestId)
            : resolveIdempotencyKey(request.headers);
        const tickets = parsed.success ? parsed.data.tickets : undefined;
        const reverseOpen = parsed.success ? parsed.data.reverseOpen : undefined;
        const payload = parsed.success ? { groupId: id, ...parsed.data } : { groupId: id };
        const group = await orderGroupIdempotency.execute(`order-group-batch-close:${id}`, requestId, payload, async () => orderGroupService.batchClose(id, tickets, { reverseOpen }));
        return { data: group };
    });
    app.post('/api/v1/order-groups/batch-close-many', {
        schema: {
            tags: ['OrderGroups'],
            summary: '批量订单组平仓',
            description: '一次操作多个订单组，对每个订单组内所有未平仓订单执行批量平仓',
            body: zToSchema(batchCloseManyBody),
            headers: {
                type: 'object',
                properties: {
                    'x-idempotency-key': { type: 'string', description: '幂等键；也可通过 body.requestId 传入' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: orderGroupDto,
                        },
                    },
                },
                400: errorResponse,
            },
        },
    }, async (request) => {
        const parsed = batchCloseManyBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const requestId = resolveIdempotencyKey(request.headers, parsed.data.requestId);
        const payload = parsed.data;
        const groups = await orderGroupIdempotency.execute('order-group-batch-close-many', requestId, payload, async () => orderGroupService.batchCloseMany(parsed.data.groupIds, {
            reverseOpen: parsed.data.reverseOpen,
        }));
        return { data: groups };
    });
}
function parseId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('Invalid id');
    }
    return id;
}
//# sourceMappingURL=order-groups.js.map