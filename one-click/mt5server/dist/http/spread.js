import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { zToSchema, idParam, errorResponse } from './schema-helper.js';
const accountGroupIdParam = idParam('accountGroupId', 'Account Group ID');
const subscriptionIdParam = {
    type: 'object',
    properties: {
        accountGroupId: { type: 'integer' },
        subscriptionId: { type: 'integer' },
    },
    required: ['accountGroupId', 'subscriptionId'],
};
const spreadSubscriptionBody = z.object({
    name: z.string().min(1),
    symbolA: z.string().min(1),
    symbolB: z.string().min(1),
    lotsA: z.number().positive().optional(),
    lotsB: z.number().positive().nullable().optional(),
    isEnabled: z.boolean().optional(),
    notifyEnabled: z.boolean().optional(),
    notifyChannelIds: z.array(z.number().int().positive()).optional(),
    notifyLongThreshold: z.number().min(0).optional(),
    notifyShortThreshold: z.number().min(0).optional(),
    notifyStabilitySeconds: z.number().int().min(0).optional(),
    cooldownSeconds: z.number().int().min(0).optional(),
    autoTradeEnabled: z.boolean().optional(),
    autoOpenExpandEnabled: z.boolean().optional(),
    autoOpenShrinkEnabled: z.boolean().optional(),
    targetExpandGroups: z.number().int().min(0).optional(),
    targetShrinkGroups: z.number().int().min(0).optional(),
    autoOpenExpandThreshold: z.number().min(0).nullable().optional(),
    autoOpenShrinkThreshold: z.number().min(0).nullable().optional(),
    autoOpenStabilitySeconds: z.number().int().min(0).optional(),
    autoOpenCooldownSeconds: z.number().int().min(0).optional(),
    autoCloseEnabled: z.boolean().optional(),
    autoCloseExpandEnabled: z.boolean().optional(),
    autoCloseShrinkEnabled: z.boolean().optional(),
    autoCloseExpandProtection: z.number().min(0).nullable().optional(),
    autoCloseShrinkProtection: z.number().min(0).nullable().optional(),
    autoCloseStabilitySeconds: z.number().int().min(0).optional(),
    autoCloseBatchCount: z.number().int().min(1).optional(),
    autoCloseCooldownSeconds: z.number().int().min(0).optional(),
    singleLegDetectEnabled: z.boolean().optional(),
    singleLegTimeoutSeconds: z.number().int().min(0).optional(),
    singleLegPriceDriftThreshold: z.number().min(0).nullable().optional(),
    autoCloseSingleLegEnabled: z.boolean().optional(),
    autoCloseSingleLegCooldownSeconds: z.number().int().min(0).optional(),
    autoCloseSingleLegMaxRetries: z.number().int().min(0).optional(),
    singleLegNotifyEnabled: z.boolean().optional(),
    singleLegNotifyChannelIds: z.array(z.number().int().positive()).optional(),
    singleLegNotifyLevels: z.array(z.enum(['info', 'warn', 'error'])).min(1).optional(),
});
const updateSpreadSubscriptionBody = z.object({
    name: z.string().min(1).optional(),
    symbolA: z.string().min(1).optional(),
    symbolB: z.string().min(1).optional(),
    lotsA: z.number().positive().optional(),
    lotsB: z.number().positive().nullable().optional(),
    isEnabled: z.boolean().optional(),
    notifyEnabled: z.boolean().optional(),
    notifyChannelIds: z.array(z.number().int().positive()).optional(),
    notifyLongThreshold: z.number().min(0).nullable().optional(),
    notifyShortThreshold: z.number().min(0).nullable().optional(),
    notifyStabilitySeconds: z.number().int().min(0).optional(),
    cooldownSeconds: z.number().int().min(0).optional(),
    autoTradeEnabled: z.boolean().optional(),
    autoOpenExpandEnabled: z.boolean().optional(),
    autoOpenShrinkEnabled: z.boolean().optional(),
    targetExpandGroups: z.number().int().min(0).optional(),
    targetShrinkGroups: z.number().int().min(0).optional(),
    autoOpenExpandThreshold: z.number().min(0).nullable().optional(),
    autoOpenShrinkThreshold: z.number().min(0).nullable().optional(),
    autoOpenStabilitySeconds: z.number().int().min(0).optional(),
    autoOpenCooldownSeconds: z.number().int().min(0).optional(),
    autoCloseEnabled: z.boolean().optional(),
    autoCloseExpandEnabled: z.boolean().optional(),
    autoCloseShrinkEnabled: z.boolean().optional(),
    autoCloseExpandProtection: z.number().min(0).nullable().optional(),
    autoCloseShrinkProtection: z.number().min(0).nullable().optional(),
    autoCloseStabilitySeconds: z.number().int().min(0).optional(),
    autoCloseBatchCount: z.number().int().min(1).optional(),
    autoCloseCooldownSeconds: z.number().int().min(0).optional(),
    singleLegDetectEnabled: z.boolean().optional(),
    singleLegTimeoutSeconds: z.number().int().min(0).optional(),
    singleLegPriceDriftThreshold: z.number().min(0).nullable().optional(),
    autoCloseSingleLegEnabled: z.boolean().optional(),
    autoCloseSingleLegCooldownSeconds: z.number().int().min(0).optional(),
    autoCloseSingleLegMaxRetries: z.number().int().min(0).optional(),
    singleLegNotifyEnabled: z.boolean().optional(),
    singleLegNotifyChannelIds: z.array(z.number().int().positive()).optional(),
    singleLegNotifyLevels: z.array(z.enum(['info', 'warn', 'error'])).min(1).optional(),
});
const autoTradeLogQuery = z.object({
    accountGroupId: z.coerce.number().int().positive().optional(),
    subscriptionId: z.coerce.number().int().positive().optional(),
    phase: z.enum(['decision', 'execution', 'runtime']).optional(),
    level: z.enum(['info', 'warn', 'error']).optional(),
    direction: z.enum(['expand', 'shrink']).optional(),
    action: z.string().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
const placeSpreadOrderBody = z.object({
    subscriptionId: z.number().int().positive(),
    direction: z.enum(['sellA_buyB', 'sellB_buyA']),
    lotsA: z.number().positive(),
    lotsB: z.number().positive().optional(),
    comment: z.string().optional(),
    orderGroupName: z.string().optional(),
    remark: z.string().optional(),
    slA: z.number().optional(),
    tpA: z.number().optional(),
    slB: z.number().optional(),
    tpB: z.number().optional(),
});
const spreadChartQuery = z.object({
    timeframe: z.coerce.number().int().refine((value) => [1, 5, 15].includes(value), 'timeframe 必须为 1、5 或 15').default(1),
    limit: z.coerce.number().int().min(10).max(500).default(120),
});
const spreadSecondLineSeedQuery = z.object({
    seconds: z.coerce.number().int().min(10).max(360).default(360),
});
const spreadSubscriptionDto = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        accountGroupId: { type: 'integer' },
        name: { type: 'string' },
        symbolA: { type: 'string' },
        symbolB: { type: 'string' },
        lotsA: { type: 'number', description: 'A 账号默认下单手数' },
        lotsB: { type: 'number', nullable: true, description: 'B 账号默认下单手数；为空时可沿用 lotsA' },
        isEnabled: { type: 'boolean' },
        runtimeStarted: { type: 'boolean', description: '仅表示当前进程内是否已启动该订阅' },
        notifyEnabled: { type: 'boolean' },
        notifyChannelIds: { type: 'array', items: { type: 'integer' } },
        notifyLongThreshold: { type: 'number', nullable: true },
        notifyShortThreshold: { type: 'number', nullable: true },
        notifyStabilitySeconds: { type: 'integer' },
        cooldownSeconds: { type: 'integer' },
        autoTrade: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' },
                autoOpenExpandEnabled: { type: 'boolean' },
                autoOpenShrinkEnabled: { type: 'boolean' },
                targetExpandGroups: { type: 'integer' },
                targetShrinkGroups: { type: 'integer' },
                autoOpenExpandThreshold: { type: 'number', nullable: true },
                autoOpenShrinkThreshold: { type: 'number', nullable: true },
                autoOpenStabilitySeconds: { type: 'integer' },
                autoOpenCooldownSeconds: { type: 'integer' },
                autoCloseEnabled: { type: 'boolean' },
                autoCloseExpandEnabled: { type: 'boolean' },
                autoCloseShrinkEnabled: { type: 'boolean' },
                autoCloseExpandProtection: { type: 'number', nullable: true },
                autoCloseShrinkProtection: { type: 'number', nullable: true },
                autoCloseStabilitySeconds: { type: 'integer' },
                autoCloseBatchCount: { type: 'integer' },
                autoCloseCooldownSeconds: { type: 'integer' },
                singleLegDetectEnabled: { type: 'boolean' },
                singleLegTimeoutSeconds: { type: 'integer' },
                singleLegPriceDriftThreshold: { type: 'number', nullable: true },
                autoCloseSingleLegEnabled: { type: 'boolean' },
                autoCloseSingleLegCooldownSeconds: { type: 'integer' },
                autoCloseSingleLegMaxRetries: { type: 'integer' },
                singleLegNotifyEnabled: { type: 'boolean' },
                singleLegNotifyChannelIds: { type: 'array', items: { type: 'integer' } },
                singleLegNotifyLevels: { type: 'array', items: { type: 'string', enum: ['info', 'warn', 'error'] } },
            },
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
    },
};
const autoTradeLogDto = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        accountGroupId: { type: 'integer' },
        subscriptionId: { type: 'integer' },
        phase: { type: 'string', enum: ['decision', 'execution', 'runtime'] },
        action: { type: 'string' },
        direction: { type: 'string', enum: ['expand', 'shrink'], nullable: true },
        level: { type: 'string', enum: ['info', 'warn', 'error'] },
        reason: { type: 'string', nullable: true },
        runtimeState: { type: 'string', nullable: true },
        longSpread: { type: 'number', nullable: true },
        shortSpread: { type: 'number', nullable: true },
        longStableSeconds: { type: 'number', nullable: true },
        shortStableSeconds: { type: 'number', nullable: true },
        requestId: { type: 'string', nullable: true },
        metadata: { type: 'object', nullable: true, additionalProperties: true },
        createdAt: { type: 'string' },
    },
};
const autoTradeRuntimeSideDto = {
    type: 'object',
    properties: {
        status: { type: 'string', enum: ['idle', 'opening', 'open_cooldown', 'closing', 'close_cooldown'] },
        opening: { type: 'boolean' },
        closing: { type: 'boolean' },
        cooldownRemainingSeconds: { type: 'number' },
        lastActionAt: { type: 'string', nullable: true },
        lastOpenAt: { type: 'string', nullable: true },
        lastCloseAt: { type: 'string', nullable: true },
        lastReason: { type: 'string', nullable: true },
        lastError: { type: 'string', nullable: true },
        currentGroupCount: { type: 'integer' },
        targetGroupCount: { type: 'integer' },
    },
};
const autoTradeRuntimeDto = {
    type: 'object',
    properties: {
        subscriptionId: { type: 'integer' },
        accountGroupId: { type: 'integer' },
        enabled: { type: 'boolean' },
        locked: { type: 'boolean' },
        expand: autoTradeRuntimeSideDto,
        shrink: autoTradeRuntimeSideDto,
    },
};
const spreadQuoteDto = {
    type: 'object',
    nullable: true,
    properties: {
        accountId: { type: 'integer' },
        login: { type: 'integer' },
        label: { type: 'string', nullable: true },
        symbol: { type: 'string' },
        bid: { type: 'number' },
        ask: { type: 'number' },
        time: { type: 'string' },
        heartbeat: { type: 'integer', description: '每 100ms 未变化则 +1，变化则重置为 0' },
    },
};
const spreadSnapshotDto = {
    type: 'object',
    properties: {
        subscription: spreadSubscriptionDto,
        status: { type: 'string', enum: ['ready', 'waiting_quote', 'disabled'] },
        accountAQuote: spreadQuoteDto,
        accountBQuote: spreadQuoteDto,
        longSpread: { type: 'number', nullable: true, description: 'a.ask - (lotsB/lotsA) * b.bid；lotsB 为空时按 lotsA 处理' },
        shortSpread: { type: 'number', nullable: true, description: 'a.bid - (lotsB/lotsA) * b.ask；lotsB 为空时按 lotsA 处理' },
        stability: {
            type: 'object',
            properties: {
                isLongStable: { type: 'boolean' },
                isShortStable: { type: 'boolean' },
                longStableMs: { type: 'integer' },
                shortStableMs: { type: 'integer' },
                longStableSeconds: { type: 'number' },
                shortStableSeconds: { type: 'number' },
            },
        },
    },
};
const panelDto = {
    type: 'object',
    properties: {
        accountGroupId: { type: 'integer' },
        accountGroupName: { type: 'string' },
        accountA: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                login: { type: 'integer' },
                label: { type: 'string', nullable: true },
                sessionId: { type: 'string', nullable: true },
            },
        },
        accountB: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                login: { type: 'integer' },
                label: { type: 'string', nullable: true },
                sessionId: { type: 'string', nullable: true },
            },
        },
        subscriptions: { type: 'array', items: spreadSnapshotDto },
    },
};
const spreadChartDto = {
    type: 'object',
    properties: {
        subscriptionId: { type: 'integer' },
        accountGroupId: { type: 'integer' },
        timeframeMinutes: { type: 'integer', enum: [1, 5, 15] },
        accountA: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                symbol: { type: 'string' },
                candles: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            time: { type: 'string' },
                            open: { type: 'number' },
                            high: { type: 'number' },
                            low: { type: 'number' },
                            close: { type: 'number' },
                        },
                    },
                },
            },
        },
        accountB: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                symbol: { type: 'string' },
                candles: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            time: { type: 'string' },
                            open: { type: 'number' },
                            high: { type: 'number' },
                            low: { type: 'number' },
                            close: { type: 'number' },
                        },
                    },
                },
            },
        },
        spread: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                symbol: { type: 'string' },
                candles: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            time: { type: 'string' },
                            open: { type: 'number' },
                            high: { type: 'number' },
                            low: { type: 'number' },
                            close: { type: 'number' },
                        },
                    },
                },
            },
        },
    },
};
const spreadLinePointDto = {
    type: 'object',
    properties: {
        time: { type: 'string' },
        value: { type: 'number' },
    },
};
const spreadSecondLineSeedDto = {
    type: 'object',
    properties: {
        subscriptionId: { type: 'integer' },
        accountGroupId: { type: 'integer' },
        seconds: { type: 'integer' },
        accountA: { type: 'array', items: spreadLinePointDto },
        accountB: { type: 'array', items: spreadLinePointDto },
        expandSpread: { type: 'array', items: spreadLinePointDto },
        shrinkSpread: { type: 'array', items: spreadLinePointDto },
    },
};
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
        status: { type: 'string' },
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
export function registerSpreadRoutes(app, spreadService) {
    app.get('/api/v1/account-groups/:accountGroupId/spread-subscriptions', {
        schema: {
            tags: ['Spread'],
            summary: '账号组价差订阅列表',
            params: accountGroupIdParam,
            response: {
                200: { type: 'object', properties: { data: { type: 'array', items: spreadSubscriptionDto } } },
                404: errorResponse,
            },
        },
    }, async (request) => {
        const accountGroupId = parseId(request.params.accountGroupId, 'accountGroupId');
        return { data: await spreadService.listByAccountGroup(accountGroupId) };
    });
    app.post('/api/v1/account-groups/:accountGroupId/spread-subscriptions', {
        schema: {
            tags: ['Spread'],
            summary: '创建账号组价差订阅',
            params: accountGroupIdParam,
            body: zToSchema(spreadSubscriptionBody),
            response: {
                201: { type: 'object', properties: { data: spreadSubscriptionDto } },
                400: errorResponse,
                404: errorResponse,
            },
        },
    }, async (request, reply) => {
        const accountGroupId = parseId(request.params.accountGroupId, 'accountGroupId');
        const parsed = spreadSubscriptionBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const result = await spreadService.create(accountGroupId, parsed.data);
        return reply.status(201).send({ data: result });
    });
    app.patch('/api/v1/account-groups/:accountGroupId/spread-subscriptions/:subscriptionId', {
        schema: {
            tags: ['Spread'],
            summary: '更新账号组价差订阅',
            params: subscriptionIdParam,
            body: zToSchema(updateSpreadSubscriptionBody),
            response: {
                200: { type: 'object', properties: { data: spreadSubscriptionDto } },
                400: errorResponse,
                404: errorResponse,
            },
        },
    }, async (request) => {
        const accountGroupId = parseId(request.params.accountGroupId, 'accountGroupId');
        const subscriptionId = parseId(request.params.subscriptionId, 'subscriptionId');
        const parsed = updateSpreadSubscriptionBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        return { data: await spreadService.update(accountGroupId, subscriptionId, parsed.data) };
    });
    app.delete('/api/v1/account-groups/:accountGroupId/spread-subscriptions/:subscriptionId', {
        schema: {
            tags: ['Spread'],
            summary: '删除账号组价差订阅',
            params: subscriptionIdParam,
            response: {
                204: { type: 'null', description: '删除成功' },
                404: errorResponse,
            },
        },
    }, async (request, reply) => {
        const accountGroupId = parseId(request.params.accountGroupId, 'accountGroupId');
        const subscriptionId = parseId(request.params.subscriptionId, 'subscriptionId');
        await spreadService.delete(accountGroupId, subscriptionId);
        return reply.status(204).send();
    });
    app.get('/api/v1/auto-trade/logs', {
        schema: {
            tags: ['Spread'],
            summary: '自动交易日志列表',
            querystring: zToSchema(autoTradeLogQuery),
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: autoTradeLogDto },
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        pageSize: { type: 'integer' },
                    },
                },
                400: errorResponse,
            },
        },
    }, async (request) => {
        const parsed = autoTradeLogQuery.safeParse(request.query);
        if (!parsed.success) {
            throw new ValidationError('Invalid querystring', parsed.error.flatten().fieldErrors);
        }
        const result = await spreadService.listAutoTradeLogs(parsed.data);
        return {
            data: result.items,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
        };
    });
    app.get('/api/v1/auto-trade/runtime', {
        schema: {
            tags: ['Spread'],
            summary: '自动交易运行态列表',
            querystring: {
                type: 'object',
                properties: {
                    accountGroupId: { type: 'integer', minimum: 1 },
                    subscriptionId: { type: 'integer', minimum: 1 },
                },
            },
            response: {
                200: { type: 'object', properties: { data: { type: 'array', items: autoTradeRuntimeDto } } },
            },
        },
    }, async (request) => {
        const accountGroupIdRaw = request.query.accountGroupId;
        const subscriptionIdRaw = request.query.subscriptionId;
        const accountGroupId = accountGroupIdRaw === undefined
            ? undefined
            : parseId(String(accountGroupIdRaw), 'accountGroupId');
        const subscriptionId = subscriptionIdRaw === undefined
            ? undefined
            : parseId(String(subscriptionIdRaw), 'subscriptionId');
        return { data: await spreadService.listAutoTradeRuntime(accountGroupId, subscriptionId) };
    });
    app.get('/api/v1/account-groups/:accountGroupId/spread-panel', {
        schema: {
            tags: ['Spread'],
            summary: '交易面板价差预览',
            description: '返回账号组、价差配置和当前最新报价/价差，供交易面板直接展示。',
            params: accountGroupIdParam,
            response: {
                200: { type: 'object', properties: { data: panelDto } },
                404: errorResponse,
            },
        },
    }, async (request) => {
        const accountGroupId = parseId(request.params.accountGroupId, 'accountGroupId');
        return { data: await spreadService.getPanel(accountGroupId) };
    });
    app.get('/api/v1/account-groups/:accountGroupId/spread-subscriptions/:subscriptionId/chart', {
        schema: {
            tags: ['Spread'],
            summary: '获取价差图表历史序列',
            params: subscriptionIdParam,
            querystring: zToSchema(spreadChartQuery),
            response: {
                200: { type: 'object', properties: { data: spreadChartDto } },
                400: errorResponse,
                404: errorResponse,
            },
        },
    }, async (request) => {
        const accountGroupId = parseId(request.params.accountGroupId, 'accountGroupId');
        const subscriptionId = parseId(request.params.subscriptionId, 'subscriptionId');
        const parsed = spreadChartQuery.safeParse(request.query);
        if (!parsed.success) {
            throw new ValidationError('Invalid querystring', parsed.error.flatten().fieldErrors);
        }
        return {
            data: await spreadService.getChart(accountGroupId, subscriptionId, parsed.data.timeframe, parsed.data.limit),
        };
    });
    app.get('/api/v1/account-groups/:accountGroupId/spread-subscriptions/:subscriptionId/second-line-seed', {
        schema: {
            tags: ['Spread'],
            summary: '获取秒级折线图 seed 数据',
            description: '返回最近 N 秒的 A/B 标的与差价点序列，供前端首次渲染秒级折线图；后续继续复用 spreadUpdate 增量更新。',
            params: subscriptionIdParam,
            querystring: zToSchema(spreadSecondLineSeedQuery),
            response: {
                200: { type: 'object', properties: { data: spreadSecondLineSeedDto } },
                400: errorResponse,
                404: errorResponse,
            },
        },
    }, async (request) => {
        const accountGroupId = parseId(request.params.accountGroupId, 'accountGroupId');
        const subscriptionId = parseId(request.params.subscriptionId, 'subscriptionId');
        const parsed = spreadSecondLineSeedQuery.safeParse(request.query);
        if (!parsed.success) {
            throw new ValidationError('Invalid querystring', parsed.error.flatten().fieldErrors);
        }
        return {
            data: await spreadService.getSecondLineSeed(accountGroupId, subscriptionId, parsed.data.seconds),
        };
    });
    app.post('/api/v1/account-groups/:accountGroupId/spread-panel/order', {
        schema: {
            tags: ['Spread'],
            summary: '交易面板按价差一键下单',
            description: '基于最新内存报价完成双腿下单，并自动创建订单组记录。',
            params: accountGroupIdParam,
            body: zToSchema(placeSpreadOrderBody),
            response: {
                200: { type: 'object', properties: { data: orderGroupDto } },
                400: errorResponse,
                404: errorResponse,
            },
        },
    }, async (request) => {
        const accountGroupId = parseId(request.params.accountGroupId, 'accountGroupId');
        const parsed = placeSpreadOrderBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        return { data: await spreadService.placeOrder(accountGroupId, parsed.data) };
    });
}
function parseId(raw, name) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError(`Invalid ${name}`);
    }
    return id;
}
//# sourceMappingURL=spread.js.map