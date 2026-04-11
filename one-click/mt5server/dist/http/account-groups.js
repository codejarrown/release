import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { zToSchema, idParam, errorResponse } from './schema-helper.js';
const createBody = z.object({
    name: z.string().min(1),
    accountAId: z.number().int().positive(),
    accountBId: z.number().int().positive(),
});
const updateBody = z.object({
    name: z.string().min(1).optional(),
    accountAId: z.number().int().positive().optional(),
    accountBId: z.number().int().positive().optional(),
    isEnabled: z.boolean().optional(),
});
const listQuery = z.object({
    isEnabled: z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional(),
});
const accountSummarySchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        login: { type: 'integer' },
        label: { type: 'string', nullable: true },
        connectionType: { type: 'string', enum: ['address', 'server'] },
        isEnabled: { type: 'boolean' },
        sessionId: { type: 'string', nullable: true },
    },
};
const groupDto = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        accountAId: { type: 'integer' },
        accountBId: { type: 'integer' },
        accountA: accountSummarySchema,
        accountB: accountSummarySchema,
        isEnabled: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
    },
};
export function registerAccountGroupRoutes(app, groupService) {
    app.get('/api/v1/accounts/options', {
        schema: {
            tags: ['AccountGroups'],
            summary: '账号选择列表（供绑定）',
            description: '返回精简账号列表，供创建/编辑账号组时下拉选择',
            querystring: {
                type: 'object',
                properties: {
                    isEnabled: { type: 'string', enum: ['true', 'false'], description: '按启用状态筛选' },
                },
            },
            response: {
                200: { type: 'object', properties: { data: { type: 'array', items: accountSummarySchema } } },
            },
        },
    }, async (request) => {
        const query = listQuery.safeParse(request.query);
        const filter = query.success ? { isEnabled: query.data.isEnabled } : {};
        const options = await groupService.listAccountOptions(filter);
        return { data: options };
    });
    app.get('/api/v1/account-groups', {
        schema: {
            tags: ['AccountGroups'],
            summary: '账号组列表',
            querystring: {
                type: 'object',
                properties: {
                    isEnabled: { type: 'string', enum: ['true', 'false'], description: '按启用状态筛选' },
                },
            },
            response: {
                200: { type: 'object', properties: { data: { type: 'array', items: groupDto } } },
            },
        },
    }, async (request) => {
        const query = listQuery.safeParse(request.query);
        const filter = query.success ? { isEnabled: query.data.isEnabled } : {};
        const groups = await groupService.list(filter);
        return { data: groups };
    });
    app.get('/api/v1/account-groups/:id', {
        schema: {
            tags: ['AccountGroups'],
            summary: '账号组详情',
            params: idParam(),
            response: {
                200: { type: 'object', properties: { data: groupDto } },
                404: errorResponse,
            },
        },
    }, async (request) => {
        const id = parseId(request.params.id);
        const group = await groupService.getById(id);
        return { data: group };
    });
    app.post('/api/v1/account-groups', {
        schema: {
            tags: ['AccountGroups'],
            summary: '创建账号组',
            description: '从已有账号中选取 A / B 两个账号组成套利对',
            body: zToSchema(createBody),
            response: {
                201: { type: 'object', properties: { data: groupDto } },
                400: errorResponse,
            },
        },
    }, async (request, reply) => {
        const parsed = createBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const group = await groupService.create(parsed.data);
        return reply.status(201).send({ data: group });
    });
    app.patch('/api/v1/account-groups/:id', {
        schema: {
            tags: ['AccountGroups'],
            summary: '更新账号组',
            params: idParam(),
            body: zToSchema(updateBody),
            response: {
                200: { type: 'object', properties: { data: groupDto } },
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
        const group = await groupService.update(id, parsed.data);
        return { data: group };
    });
    app.delete('/api/v1/account-groups/:id', {
        schema: {
            tags: ['AccountGroups'],
            summary: '删除账号组',
            params: idParam(),
            response: {
                204: { type: 'null', description: '删除成功' },
                404: errorResponse,
            },
        },
    }, async (request, reply) => {
        const id = parseId(request.params.id);
        await groupService.delete(id);
        return reply.status(204).send();
    });
}
function parseId(raw) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('Invalid id');
    }
    return id;
}
//# sourceMappingURL=account-groups.js.map