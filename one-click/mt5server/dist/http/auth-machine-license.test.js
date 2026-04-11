import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { generateMachineLicense } from '../lib/machine-license.js';
import { registerAuthHook } from './auth.js';
import { registerMachineLicenseRoutes } from './auth-machine-license.js';
const API_SECRET = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const MACHINE_LICENSE_SECRET = 'machine-license-secret';
function buildApp() {
    const app = Fastify();
    registerAuthHook(app, API_SECRET, MACHINE_LICENSE_SECRET);
    registerMachineLicenseRoutes(app, API_SECRET, MACHINE_LICENSE_SECRET);
    return app;
}
describe('registerMachineLicenseRoutes', () => {
    it('generates machine license with API_SECRET', async () => {
        const app = buildApp();
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/machine-license/generate',
            headers: { authorization: `Bearer ${API_SECRET}` },
            payload: { machineId: 'PC-001' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({
            data: {
                machineId: 'pc-001',
                licenseCode: generateMachineLicense('pc-001', MACHINE_LICENSE_SECRET),
            },
        });
        await app.close();
    });
    it('rejects generation with single-machine license', async () => {
        const app = buildApp();
        const machineId = 'pc-001';
        const license = generateMachineLicense(machineId, MACHINE_LICENSE_SECRET);
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/machine-license/generate',
            headers: {
                authorization: `Bearer ${license}`,
                'x-machine-id': machineId,
            },
            payload: { machineId: 'pc-002' },
        });
        expect(res.statusCode).toBe(403);
        await app.close();
    });
    it('accepts machine_id compatibility field', async () => {
        const app = buildApp();
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/machine-license/generate',
            headers: { authorization: `Bearer ${API_SECRET}` },
            payload: { machine_id: 'PC-003' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({
            data: {
                machineId: 'pc-003',
                licenseCode: generateMachineLicense('pc-003', MACHINE_LICENSE_SECRET),
            },
        });
        await app.close();
    });
});
//# sourceMappingURL=auth-machine-license.test.js.map