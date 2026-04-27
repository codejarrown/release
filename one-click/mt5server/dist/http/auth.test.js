import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateMachineLicense } from '../lib/machine-license.js';
import { registerAuthHook, secretsEqual } from './auth.js';
const { machineIdMock } = vi.hoisted(() => ({
    machineIdMock: vi.fn(),
}));
vi.mock('node-machine-id', () => ({
    default: {
        machineIdSync: machineIdMock,
        machineId: machineIdMock,
    },
}));
describe('secretsEqual', () => {
    it('returns true only for exact match', () => {
        expect(secretsEqual('abc', 'abc')).toBe(true);
        expect(secretsEqual('abc', 'abC')).toBe(false);
        expect(secretsEqual('abc', 'abcd')).toBe(false);
    });
});
describe('registerAuthHook', () => {
    beforeEach(() => {
        machineIdMock.mockReset();
    });
    it('returns 401 without credentials', async () => {
        const app = Fastify();
        registerAuthHook(app, 'secret-one-secret-one-secret-one-secret-one');
        app.get('/api/t', async () => ({ ok: true }));
        const res = await app.inject({ method: 'GET', url: '/api/t' });
        expect(res.statusCode).toBe(401);
        await app.close();
    });
    it('allows Bearer token when equal', async () => {
        const secret = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const app = Fastify();
        registerAuthHook(app, secret);
        app.get('/api/t', async () => ({ ok: true }));
        const res = await app.inject({
            method: 'GET',
            url: '/api/t',
            headers: { authorization: `Bearer ${secret}` },
        });
        expect(res.statusCode).toBe(200);
        await app.close();
    });
    it('allows single-machine license with machineId header', async () => {
        const secret = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const machineLicenseSecret = 'machine-license-secret';
        const machineId = 'pc-001';
        const license = generateMachineLicense(machineId, machineLicenseSecret);
        const app = Fastify();
        registerAuthHook(app, secret, machineLicenseSecret);
        app.get('/api/t', async () => ({ ok: true }));
        const res = await app.inject({
            method: 'GET',
            url: '/api/t',
            headers: {
                authorization: `Bearer ${license}`,
                'x-machine-id': machineId,
            },
        });
        expect(res.statusCode).toBe(200);
        await app.close();
    });
    it('allows single-machine license without machineId when local machine id matches', async () => {
        machineIdMock.mockResolvedValue('pc-local-001');
        const secret = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const machineLicenseSecret = 'machine-license-secret';
        const license = generateMachineLicense('pc-local-001', machineLicenseSecret);
        const app = Fastify();
        registerAuthHook(app, secret, machineLicenseSecret);
        app.get('/api/t', async () => ({ ok: true }));
        const res = await app.inject({
            method: 'GET',
            url: '/api/t',
            headers: {
                authorization: `Bearer ${license}`,
            },
        });
        expect(res.statusCode).toBe(200);
        await app.close();
    });
    it('accepts x-machineid compatibility header', async () => {
        const secret = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const machineLicenseSecret = 'machine-license-secret';
        const machineId = 'pc-compat-001';
        const license = generateMachineLicense(machineId, machineLicenseSecret);
        const app = Fastify();
        registerAuthHook(app, secret, machineLicenseSecret);
        app.get('/api/t', async () => ({ ok: true }));
        const res = await app.inject({
            method: 'GET',
            url: '/api/t',
            headers: {
                authorization: `Bearer ${license}`,
                'x-machineid': machineId,
            },
        });
        expect(res.statusCode).toBe(200);
        await app.close();
    });
    it('skips /healthz and /api/v1/auth/machine-id', async () => {
        const app = Fastify();
        registerAuthHook(app, 'x');
        app.get('/healthz', async () => ({ status: 'ok' }));
        app.get('/api/v1/auth/machine-id', async () => ({ machineId: 'id' }));
        expect((await app.inject({ method: 'GET', url: '/healthz' })).statusCode).toBe(200);
        expect((await app.inject({ method: 'GET', url: '/api/v1/auth/machine-id' })).statusCode).toBe(200);
        await app.close();
    });
    it('skips non-api web paths like /', async () => {
        const app = Fastify();
        registerAuthHook(app, 'x');
        app.get('/', async () => ({ ok: true }));
        expect((await app.inject({ method: 'GET', url: '/' })).statusCode).toBe(200);
        await app.close();
    });
});
//# sourceMappingURL=auth.test.js.map