import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { zToSchema, idParam, errorResponse, dataResponse } from './schema-helper.js';
const createAccountBody = z.object({
    login: z.number().int().positive(),
    password: z.string().min(1),
    connectionType: z.enum(['address', 'server']),
    host: z.string().optional(),
    port: z.number().int().positive().optional(),
    serverName: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
    label: z.string().optional(),
    autoReconnectEnabled: z.boolean().optional(),
    reconnectDelayMs: z.number().int().min(0).optional(),
    maxReconnectAttempts: z.number().int().min(0).optional(),
});
const updateAccountBody = z.object({
    login: z.number().int().positive().optional(),
    connectionType: z.enum(['address', 'server']).optional(),
    password: z.string().min(1).optional(),
    host: z.string().optional(),
    port: z.number().int().positive().optional(),
    serverName: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
    label: z.string().nullable().optional(),
    isEnabled: z.boolean().optional(),
    autoReconnectEnabled: z.boolean().optional(),
    reconnectDelayMs: z.number().int().min(0).optional(),
    maxReconnectAttempts: z.number().int().min(0).optional(),
});
const listAccountsQuery = z.object({
    isEnabled: z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional(),
});
const subscriptionsBody = z.object({
    symbols: z.array(z.string().min(1)).nonempty(),
});
const deleteSubscriptionsQuery = z.object({
    symbols: z.string().optional(), // comma-separated list
});
const subscriptionsResponseSchema = dataResponse({
    type: 'object',
    properties: {
        symbols: { type: 'array', items: { type: 'string' } },
    },
});
const symbolsResponseSchema = dataResponse({
    type: 'object',
    properties: {
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    symbol: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    digits: { type: 'integer', nullable: true },
                    contractSize: { type: 'number', nullable: true },
                    currency: { type: 'string', nullable: true },
                    tickSize: { type: 'number', nullable: true },
                },
                required: ['symbol'],
            },
        },
    },
});
const accountPingResponseSchema = dataResponse({
    type: 'object',
    properties: {
        latencyMs: { type: 'integer' },
        host: { type: 'string' },
        port: { type: 'integer' },
    },
});
const accountDto = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        login: { type: 'integer' },
        connectionType: { type: 'string', enum: ['address', 'server'] },
        host: { type: 'string', nullable: true },
        port: { type: 'integer', nullable: true },
        serverName: { type: 'string', nullable: true },
        timeoutMs: { type: 'integer' },
        label: { type: 'string', nullable: true },
        isEnabled: { type: 'boolean' },
        autoReconnectEnabled: { type: 'boolean', description: '账号断线后是否自动重连' },
        reconnectDelayMs: { type: 'integer', description: '断线后自动重连前的等待毫秒数' },
        maxReconnectAttempts: { type: 'integer', description: '每次断线后的最大自动重连次数，0 表示不自动重连' },
        sessionId: { type: 'string', nullable: true },
        lastConnectedAt: { type: 'string', nullable: true },
        lastError: { type: 'string', nullable: true },
        defaultSubscriptions: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
            description: '账号最近一次稳定状态下订阅的 symbol 列表（来自 default_subscriptions 字段）',
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
    },
};
export function registerAccountRoutes(app, accountService) {
    app.get('/api/v1/accounts', {
        schema: {
            tags: ['Accounts'],
            summary: '账号列表',
            querystring: {
                type: 'object',
                properties: {
                    isEnabled: { type: 'string', enum: ['true', 'false'], description: '按启用状态筛选' },
                },
            },
            response: {
                200: { type: 'object', properties: { data: { type: 'array', items: accountDto } } },
            },
        },
    }, async (request) => {
        const query = listAccountsQuery.safeParse(request.query);
        const filter = query.success ? { isEnabled: query.data.isEnabled } : {};
        const accounts = await accountService.list(filter);
        return { data: accounts };
    });
    app.get('/api/v1/accounts/:id', {
        schema: {
            tags: ['Accounts'],
            summary: '账号详情',
            params: idParam(),
            response: {
                200: { type: 'object', properties: { data: accountDto } },
                404: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const account = await accountService.getById(id);
        return { data: account };
    });
    app.post('/api/v1/accounts', {
        schema: {
            tags: ['Accounts'],
            summary: '创建账号',
            body: zToSchema(createAccountBody),
            response: {
                201: { type: 'object', properties: { data: accountDto } },
                400: errorResponse,
            },
        },
    }, async (request, reply) => {
        const parsed = createAccountBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const account = await accountService.create(parsed.data);
        return reply.status(201).send({ data: account });
    });
    app.patch('/api/v1/accounts/:id', {
        schema: {
            tags: ['Accounts'],
            summary: '更新账号',
            params: idParam(),
            body: zToSchema(updateAccountBody),
            response: {
                200: { type: 'object', properties: { data: accountDto } },
                400: errorResponse,
                404: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const parsed = updateAccountBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const account = await accountService.update(id, parsed.data);
        return { data: account };
    });
    app.delete('/api/v1/accounts/:id', {
        schema: {
            tags: ['Accounts'],
            summary: '删除账号',
            params: idParam(),
            response: {
                204: { type: 'null', description: '删除成功' },
                404: errorResponse,
            },
        },
    }, async (request, reply) => {
        const id = parseId(request.params.id);
        await accountService.delete(id);
        return reply.status(204).send();
    });
    app.post('/api/v1/accounts/:id/connect', {
        schema: {
            tags: ['Accounts'],
            summary: '连接 MT5（登录）',
            description: '根据账号配置调用 SDK 登录，返回 sessionId',
            params: idParam(),
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'object',
                            properties: { sessionId: { type: 'string' } },
                        },
                    },
                },
                404: errorResponse,
                409: errorResponse,
                503: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const result = await accountService.connect(id);
        return { data: result };
    });
    app.post('/api/v1/accounts/:id/disconnect', {
        schema: {
            tags: ['Accounts'],
            summary: '断开 MT5 连接',
            params: idParam(),
            response: {
                204: { type: 'null', description: '断开成功' },
                404: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request, reply) => {
        const id = parseId(request.params.id);
        await accountService.disconnect(id);
        return reply.status(204).send();
    });
    app.get('/api/v1/accounts/:id/ping', {
        schema: {
            tags: ['Accounts'],
            summary: '测试当前账号会话到券商主机的延迟',
            description: '基于账号当前 sessionId 转发 MT5 Session Ping 接口，返回当前连接会话所绑定 host/port 的延迟。',
            params: idParam(),
            response: {
                200: accountPingResponseSchema,
                404: errorResponse,
                409: errorResponse,
                502: errorResponse,
                503: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const result = await accountService.getPing(id);
        return { data: result };
    });
    // ---- Symbols / Market ----
    app.get('/api/v1/accounts/:id/symbols', {
        schema: {
            tags: ['Accounts'],
            summary: '列出当前账号可用交易品种',
            description: '基于账号解析 sessionId，调用 MT5 Market API 获取可用品种列表，并返回精简版字段（symbol, description, digits, contractSize, currency, tickSize）。',
            params: idParam(),
            querystring: {
                type: 'object',
                properties: {
                    search: {
                        type: 'string',
                        description: '按 symbol / 描述模糊搜索',
                    },
                },
            },
            response: {
                200: symbolsResponseSchema,
                404: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const search = typeof request.query?.search === 'string'
            ? String(request.query.search)
            : undefined;
        const items = await accountService.listSymbols(id, { search });
        return { data: { items } };
    });
    // ---- Subscriptions management ----
    app.get('/api/v1/accounts/:id/subscriptions', {
        schema: {
            tags: ['Accounts'],
            summary: '查看当前账号会话订阅的品种',
            description: '基于账号解析 sessionId，调用 MT5 订阅接口返回当前已订阅的 symbol 列表。',
            params: idParam(),
            response: {
                200: subscriptionsResponseSchema,
                404: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const symbols = await accountService.listSubscriptions(id);
        return { data: { symbols } };
    });
    app.post('/api/v1/accounts/:id/subscriptions', {
        schema: {
            tags: ['Accounts'],
            summary: '批量新增订阅品种',
            description: '向 MT5 订阅给定 symbols，内部使用 subscriptions.subscribeMultiple；重复订阅同一 symbol 不视为错误。',
            params: idParam(),
            body: zToSchema(subscriptionsBody),
            response: {
                200: subscriptionsResponseSchema,
                400: errorResponse,
                404: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const parsed = subscriptionsBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const symbols = await accountService.addSubscriptions(id, parsed.data.symbols);
        return { data: { symbols } };
    });
    app.post('/api/v1/accounts/:id/subscriptions/:symbol', {
        schema: {
            tags: ['Accounts'],
            summary: '单个品种订阅',
            description: '订阅单个 symbol，可选 force=true 时使用 SDK 的 subscribeForce 进行强制订阅。',
            params: {
                type: 'object',
                required: ['id', 'symbol'],
                properties: {
                    id: { type: 'integer', minimum: 1, description: '账号 ID' },
                    symbol: { type: 'string', minLength: 1, description: '品种代码，如 EURUSD' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    force: { type: 'boolean', description: '是否使用强制订阅（subscribeForce）' },
                },
            },
            response: {
                200: subscriptionsResponseSchema,
                404: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(String(request.params.id));
        const symbol = request.params.symbol;
        const force = typeof request.query?.force === 'boolean'
            ? request.query.force
            : undefined;
        const symbols = await accountService.subscribeSymbol(id, symbol, { force });
        return { data: { symbols } };
    });
    app.delete('/api/v1/accounts/:id/subscriptions', {
        schema: {
            tags: ['Accounts'],
            summary: '取消订阅品种',
            description: '按 symbols 列表取消订阅。symbols 可从 query 或 body 提供，至少一种。',
            params: idParam(),
            querystring: {
                type: 'object',
                properties: {
                    symbols: { type: 'string', description: '逗号分隔的品种列表，如 EURUSD,USDJPY' },
                },
            },
            body: zToSchema(subscriptionsBody.partial()),
            response: {
                200: subscriptionsResponseSchema,
                400: errorResponse,
                404: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const query = deleteSubscriptionsQuery.safeParse(request.query);
        const bodyParsed = subscriptionsBody.partial().safeParse(request.body ?? {});
        let symbols = [];
        if (bodyParsed.success && Array.isArray(bodyParsed.data.symbols)) {
            symbols = bodyParsed.data.symbols.filter((s) => typeof s === 'string' && s.length > 0);
        }
        else if (query.success && query.data.symbols) {
            symbols = query.data.symbols
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
        }
        if (symbols.length === 0) {
            throw new ValidationError('symbols is required (in body or query)');
        }
        const remaining = await accountService.removeSubscriptions(id, symbols);
        return { data: { symbols: remaining } };
    });
    app.delete('/api/v1/accounts/:id/subscriptions/:symbol', {
        schema: {
            tags: ['Accounts'],
            summary: '单个品种退订',
            description: '退订单个 symbol；若当前未订阅该 symbol，则视为幂等成功。',
            params: {
                type: 'object',
                required: ['id', 'symbol'],
                properties: {
                    id: { type: 'integer', minimum: 1, description: '账号 ID' },
                    symbol: { type: 'string', minLength: 1, description: '品种代码，如 EURUSD' },
                },
            },
            response: {
                200: subscriptionsResponseSchema,
                404: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(String(request.params.id));
        const symbol = request.params.symbol;
        const remaining = await accountService.unsubscribeSymbol(id, symbol);
        return { data: { symbols: remaining } };
    });
    app.post('/api/v1/accounts/:id/subscriptions/reset', {
        schema: {
            tags: ['Accounts'],
            summary: '重置订阅（取消该账号会话的所有品种订阅）',
            description: '读取当前已订阅列表并全部取消，重置为“未订阅任何品种”状态。',
            params: idParam(),
            response: {
                200: subscriptionsResponseSchema,
                404: errorResponse,
                409: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const remaining = await accountService.resetSubscriptions(id);
        return { data: { symbols: remaining } };
    });
}
function parseId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('Invalid account id');
    }
    return id;
}
//# sourceMappingURL=accounts.js.map