import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateMachineLicense } from '../lib/machine-license.js';
import { registerAuthHook } from './auth.js';
import { registerAuthVerifyRoutes } from './auth-verify.js';
const { machineIdMock } = vi.hoisted(() => ({
    machineIdMock: vi.fn(),
}));
vi.mock('node-machine-id', () => ({
    machineId: machineIdMock,
}));
const SECRET = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const MACHINE_LICENSE_SECRET = 'machine-license-secret';
function buildApp() {
    const app = Fastify();
    registerAuthHook(app, SECRET, MACHINE_LICENSE_SECRET);
    registerAuthVerifyRoutes(app);
    return app;
}
describe('registerAuthVerifyRoutes', () => {
    beforeEach(() => {
        machineIdMock.mockReset();
    });
    it('returns valid:true when Bearer matches API_SECRET', async () => {
        const app = buildApp();
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/auth/verify',
            headers: { authorization: `Bearer ${SECRET}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ valid: true });
        await app.close();
    });
    it('returns 401 without credentials', async () => {
        const app = buildApp();
        const res = await app.inject({ method: 'GET', url: '/api/v1/auth/verify' });
        expect(res.statusCode).toBe(401);
        await app.close();
    });
    it('accepts single-machine license when machine_id is provided', async () => {
        const app = buildApp();
        const machineId = 'pc-001';
        const license = generateMachineLicense(machineId, MACHINE_LICENSE_SECRET);
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/auth/verify?api_key=${license}&machine_id=${machineId}`,
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ valid: true });
        await app.close();
    });
    it('accepts machineid compatibility query', async () => {
        const app = buildApp();
        const machineId = 'pc-001';
        const license = generateMachineLicense(machineId, MACHINE_LICENSE_SECRET);
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/auth/verify?api_key=${license}&machineid=${machineId}`,
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ valid: true });
        await app.close();
    });
    it('accepts single-machine license with bearer only when local machine id matches', async () => {
        machineIdMock.mockResolvedValue('pc-local-001');
        const app = buildApp();
        const license = generateMachineLicense('pc-local-001', MACHINE_LICENSE_SECRET);
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/auth/verify',
            headers: { authorization: `Bearer ${license}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ valid: true });
        await app.close();
    });
});
//# sourceMappingURL=auth-verify.test.js.map