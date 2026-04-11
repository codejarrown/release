import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { zToSchema, idParam, errorResponse } from './schema-helper.js';
const createBody = z.object({
    name: z.string().min(1),
    platform: z.enum(['telegram', 'dingtalk', 'feishu', 'webhook']),
    config: z.record(z.unknown()).describe('平台配置（如 Telegram: { botToken, chatId }）'),
});
const updateBody = z.object({
    name: z.string().min(1).optional(),
    config: z.record(z.unknown()).optional(),
    isEnabled: z.boolean().optional(),
});
const channelDto = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        platform: { type: 'string', enum: ['telegram', 'dingtalk', 'feishu', 'webhook'] },
        isEnabled: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
    },
};
export function registerPushRoutes(app, pushService) {
    app.get('/api/v1/push/channels', {
        schema: {
            tags: ['Push'],
            summary: '推送渠道列表',
            response: {
                200: { type: 'object', properties: { data: { type: 'array', items: channelDto } } },
            },
        },
    }, async () => {
        const channels = await pushService.list();
        return { data: channels };
    });
    app.get('/api/v1/push/channels/:id', {
        schema: {
            tags: ['Push'],
            summary: '推送渠道详情',
            params: idParam(),
            response: {
                200: { type: 'object', properties: { data: channelDto } },
                404: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const channel = await pushService.getById(id);
        return { data: channel };
    });
    app.post('/api/v1/push/channels', {
        schema: {
            tags: ['Push'],
            summary: '创建推送渠道',
            body: zToSchema(createBody),
            response: {
                201: { type: 'object', properties: { data: channelDto } },
                400: errorResponse,
            },
        },
    }, async (request, reply) => {
        const parsed = createBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const channel = await pushService.create(parsed.data);
        return reply.status(201).send({ data: channel });
    });
    app.patch('/api/v1/push/channels/:id', {
        schema: {
            tags: ['Push'],
            summary: '更新推送渠道',
            params: idParam(),
            body: zToSchema(updateBody),
            response: {
                200: { type: 'object', properties: { data: channelDto } },
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
        const channel = await pushService.update(id, parsed.data);
        return { data: channel };
    });
    app.delete('/api/v1/push/channels/:id', {
        schema: {
            tags: ['Push'],
            summary: '删除推送渠道',
            params: idParam(),
            response: {
                204: { type: 'null', description: '删除成功' },
                404: errorResponse,
            },
        },
    }, async (request, reply) => {
        const id = parseId(request.params.id);
        await pushService.delete(id);
        return reply.status(204).send();
    });
    app.post('/api/v1/push/channels/:id/test', {
        schema: {
            tags: ['Push'],
            summary: '发送测试推送',
            description: '向指定渠道发送一条测试消息，校验配置是否有效',
            params: idParam(),
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: { type: 'object', properties: { success: { type: 'boolean' } } },
                    },
                },
                404: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        await pushService.test(id);
        return { data: { success: true } };
    });
}
function parseId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('Invalid channel id');
    }
    return id;
}
//# sourceMappingURL=push.js.map