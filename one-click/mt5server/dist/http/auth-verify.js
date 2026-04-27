import { errorResponse } from './schema-helper.js';
export function registerAuthVerifyRoutes(app) {
    app.get('/api/v1/auth/verify', {
        schema: {
            tags: ['Auth'],
            summary: '校验 API 凭证',
            description: '使用与其它受保护接口相同的鉴权方式：可直接传递 `API_SECRET`，也支持传递单机授权码并额外携带 machineId。machineId 兼容请求头 `X-Machine-Id` / `X-MachineId`，以及查询参数 `machine_id` / `machineId` / `machineid`。请求到达本处理器即表示凭证已通过全局鉴权，返回 `valid: true`；缺失或错误时由全局鉴权拦截并返回 401。',
            response: {
                200: {
                    description: '凭证正确',
                    type: 'object',
                    properties: {
                        valid: { type: 'boolean', const: true },
                    },
                    required: ['valid'],
                },
                401: {
                    description: '凭证缺失或不正确',
                    ...errorResponse,
                },
            },
        },
    }, async () => {
        return { valid: true };
    });
}
//# sourceMappingURL=auth-verify.js.map