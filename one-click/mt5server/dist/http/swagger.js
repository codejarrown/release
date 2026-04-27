import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
export async function registerSwagger(app) {
    await app.register(swagger, {
        openapi: {
            openapi: '3.1.0',
            info: {
                title: 'MT5 Server API',
                description: '多账号 MT5 接入服务：账号管理、实时报价、交易、持仓、推送配置',
                version: '0.1.0',
            },
            tags: [
                { name: 'Health', description: '健康检查' },
                { name: 'Auth', description: 'API 凭证校验' },
                { name: 'Accounts', description: '账号管理 CRUD + 连接' },
                { name: 'Trading', description: '交易下单 / 平仓 / 改单' },
                { name: 'Positions', description: '持仓查询（当前 + 历史）' },
                { name: 'Push', description: '推送渠道配置 + 测试' },
                { name: 'AccountGroups', description: '账号组（套利配对 A/B）' },
                { name: 'Stream', description: '实时报价 WebSocket' },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        description: '与环境变量 API_SECRET（64 位十六进制）全量比对。也可使用请求头 `X-Api-Key`；WebSocket 可使用查询参数 `api_key`。',
                    },
                },
                schemas: {
                    ErrorResponse: {
                        type: 'object',
                        properties: {
                            code: { type: 'string' },
                            message: { type: 'string' },
                            details: {},
                        },
                        required: ['code', 'message'],
                    },
                },
            },
            security: [{ bearerAuth: [] }],
        },
    });
    await app.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
        },
    });
}
//# sourceMappingURL=swagger.js.map