import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { dataArrayResponse, dataResponse, errorResponse, zToSchema } from './schema-helper.js';
const pingBody = z.object({
    host: z.string().min(1),
    port: z.number().int().positive().default(443),
});
const serverSchema = {
    type: 'object',
    properties: {
        serverName: { type: 'string', nullable: true },
        companyName: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        addresses: {
            type: 'array',
            nullable: true,
            items: { type: 'string' },
        },
    },
};
function normalizeAddress(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (value && typeof value === 'object' && typeof value.address === 'string') {
        return value.address;
    }
    return null;
}
function toServerListItem(server) {
    const addresses = [...(server.accesses ?? []), ...(server.accessesEx ?? [])]
        .flatMap((access) => access?.addresses ?? [])
        .map((value) => normalizeAddress(value))
        .filter((value) => Boolean(value));
    return {
        serverName: server.serverInfoEx?.serverName ?? server.serverInfo?.serverName ?? null,
        companyName: server.serverInfoEx?.companyName ?? server.serverInfo?.companyName ?? null,
        address: server.serverInfoEx?.address ?? server.serverInfo?.address ?? addresses[0] ?? null,
        addresses,
    };
}
export function registerUtilitiesRoutes(app, mt5Sdk) {
    app.post('/api/v1/utils/ping', {
        schema: {
            tags: ['Utilities'],
            summary: '测试 MT5 服务器连通性',
            description: '转发 MT SDK 的 `/api/utils/ping`，返回到目标主机端口的延迟毫秒数。',
            body: zToSchema(pingBody),
            response: {
                200: dataResponse({
                    type: 'object',
                    properties: {
                        latencyMs: { type: 'integer' },
                    },
                }),
                400: errorResponse,
                500: errorResponse,
            },
        },
    }, async (request) => {
        const parsed = pingBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const data = await mt5Sdk.utilities.ping(parsed.data);
        return { data };
    });
    app.get('/api/v1/utils/servers/load/default', {
        schema: {
            tags: ['Utilities'],
            summary: '读取默认 servers.dat 服务器列表',
            description: '转发 MT SDK 的 `/api/utils/servers/load/default`，并将原始 servers.dat 结构整理为前端易用的服务器列表。',
            response: {
                200: dataArrayResponse(serverSchema),
                500: errorResponse,
            },
        },
    }, async () => {
        const data = await mt5Sdk.utilities.loadDefaultServersDat();
        return { data: data.map(toServerListItem) };
    });
}
//# sourceMappingURL=utilities.js.map