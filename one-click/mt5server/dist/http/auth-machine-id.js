import nodeMachineId from 'node-machine-id';
import { errorResponse } from './schema-helper.js';
const { machineId } = nodeMachineId;
export function registerAuthMachineIdRoutes(app) {
    const handler = async () => {
        return {
            machineId: await machineId(),
        };
    };
    const schema = {
        schema: {
            tags: ['Auth'],
            summary: '获取当前机器的 machineId',
            description: '返回服务端所在机器的 machineId，供前端在单机授权模式下自动获取并参与后续鉴权请求。',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        machineId: { type: 'string' },
                    },
                    required: ['machineId'],
                },
                500: errorResponse,
            },
        },
    };
    app.get('/api/v1/auth/machine-id', schema, handler);
    app.get('/api/v1/auth/machine_id', schema, handler);
    app.get('/api/v1/auth/machineid', schema, handler);
}
//# sourceMappingURL=auth-machine-id.js.map