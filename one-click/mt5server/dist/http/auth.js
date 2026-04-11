import { timingSafeEqual } from 'node:crypto';
import nodeMachineId from 'node-machine-id';
import { verifyMachineLicense } from '../lib/machine-license.js';
const { machineIdSync: getMachineId } = nodeMachineId;
/** 使用 timingSafeEqual 对 UTF-8 字节做全等比较（长度不同则拒绝）。 */
export function secretsEqual(provided, expected) {
    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length)
        return false;
    return timingSafeEqual(a, b);
}
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
function extractMachineId(request) {
    const xMachineId = request.headers['x-machine-id'];
    if (typeof xMachineId === 'string' && xMachineId.trim().length > 0)
        return xMachineId;
    if (Array.isArray(xMachineId) && typeof xMachineId[0] === 'string' && xMachineId[0].trim().length > 0) {
        return xMachineId[0];
    }
    const xMachineIdCompat = request.headers['x-machineid'];
    if (typeof xMachineIdCompat === 'string' && xMachineIdCompat.trim().length > 0)
        return xMachineIdCompat;
    if (Array.isArray(xMachineIdCompat) && typeof xMachineIdCompat[0] === 'string' && xMachineIdCompat[0].trim().length > 0) {
        return xMachineIdCompat[0];
    }
    const q = request.query;
    const candidates = [q.machine_id, q.machineId, q.machineid];
    for (const value of candidates) {
        if (typeof value === 'string' && value.trim().length > 0)
            return value;
    }
    const body = request.body;
    if (body && typeof body === 'object') {
        const bodyCandidates = [body.machine_id, body.machineId, body.machineid];
        for (const value of bodyCandidates) {
            if (typeof value === 'string' && value.trim().length > 0)
                return value;
        }
    }
    return undefined;
}
function isAuthExemptPath(path) {
    if (!path.startsWith('/api/'))
        return true;
    if (path === '/healthz' || path === '/readyz')
        return true;
    if (path.startsWith('/static/'))
        return true;
    if (path === '/docs' || path.startsWith('/docs/'))
        return true;
    if (path === '/api/v1/auth/machine-id')
        return true;
    if (path === '/api/v1/auth/machine_id')
        return true;
    if (path === '/api/v1/auth/machineid')
        return true;
    return false;
}
export function registerAuthHook(app, secret, machineLicenseSecret = secret) {
    app.addHook('onRequest', async (request, reply) => {
        const path = request.url.split('?')[0] ?? '';
        if (isAuthExemptPath(path))
            return;
        const provided = extractProvidedSecret(request);
        if (!provided) {
            return reply.code(401).send({
                code: 'UNAUTHORIZED',
                message: 'Invalid or missing API credentials',
            });
        }
        let machineId = extractMachineId(request);
        if (!machineId) {
            try {
                machineId = getMachineId();
            }
            catch {
                machineId = undefined;
            }
        }
        const valid = secretsEqual(provided, secret) ||
            (typeof machineId === 'string' && verifyMachineLicense(machineId, provided, machineLicenseSecret));
        if (!valid) {
            return reply.code(401).send({
                code: 'UNAUTHORIZED',
                message: 'Invalid or missing API credentials',
            });
        }
    });
}
//# sourceMappingURL=auth.js.map