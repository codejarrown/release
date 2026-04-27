import { z } from 'zod';
import { generateMachineLicense, normalizeMachineId } from '../lib/machine-license.js';
import { ValidationError } from '../lib/errors.js';
import { dataResponse, errorResponse, zToSchema } from './schema-helper.js';
import { secretsEqual } from './auth.js';
const generateMachineLicenseBody = z
    .object({
    machineId: z.string().trim().min(1, 'machineId is required').optional(),
    machine_id: z.string().trim().min(1, 'machine_id is required').optional(),
    machineid: z.string().trim().min(1, 'machineid is required').optional(),
})
    .superRefine((value, ctx) => {
    const machineId = value.machineId ?? value.machine_id ?? value.machineid;
    if (!machineId || machineId.trim().length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'machineId is required',
            path: ['machineId'],
        });
    }
});
function extractProvidedSecret(request) {
    const auth = request.headers.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
        const token = auth.slice(7).trim();
        if (token.length > 0)
            return token;
    }
    const xKey = request.headers['x-api-key'];
    if (typeof xKey === 'string' && xKey.length > 0)
        return xKey;
    if (Array.isArray(xKey) && typeof xKey[0] === 'string' && xKey[0].length > 0) {
        return xKey[0];
    }
    const q = request.query;
    const apiKey = q.api_key;
    if (typeof apiKey === 'string' && apiKey.length > 0)
        return apiKey;
    return undefined;
}
export function registerMachineLicenseRoutes(app, apiSecret, machineLicenseSecret) {
    app.post('/api/v1/auth/machine-license/generate', {
        schema: {
            tags: ['Auth'],
            summary: '生成单机授权码',
            description: '根据用户提供的 machineId 生成单机授权码。兼容 body 字段 `machineId`、`machine_id`、`machineid`。该接口要求使用主 API_SECRET 调用，通常用于管理员为用户生成授权码。',
            body: zToSchema(generateMachineLicenseBody),
            response: {
                200: dataResponse({
                    type: 'object',
                    properties: {
                        machineId: { type: 'string' },
                        licenseCode: { type: 'string' },
                    },
                    required: ['machineId', 'licenseCode'],
                }),
                400: errorResponse,
                403: errorResponse,
            },
        },
    }, async (request, reply) => {
        const provided = extractProvidedSecret(request);
        if (!provided || !secretsEqual(provided, apiSecret)) {
            return reply.code(403).send({
                code: 'FORBIDDEN',
                message: 'Only API_SECRET can generate machine licenses',
            });
        }
        const parsed = generateMachineLicenseBody.safeParse(request.body);
        if (!parsed.success) {
            throw new ValidationError('Invalid request body', parsed.error.flatten().fieldErrors);
        }
        const machineId = normalizeMachineId(parsed.data.machineId ?? parsed.data.machine_id ?? parsed.data.machineid ?? '');
        const licenseCode = generateMachineLicense(machineId, machineLicenseSecret);
        return {
            data: {
                machineId,
                licenseCode,
            },
        };
    });
}
//# sourceMappingURL=auth-machine-license.js.map