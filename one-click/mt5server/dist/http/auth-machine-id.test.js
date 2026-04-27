import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const machineIdMock = vi.fn();
vi.mock('node-machine-id', () => ({
    default: {
        machineId: machineIdMock,
        machineIdSync: vi.fn(),
    },
}));
describe('registerAuthMachineIdRoutes', () => {
    beforeEach(() => {
        machineIdMock.mockReset();
    });
    it('returns machineId without auth', async () => {
        machineIdMock.mockResolvedValue('machine-id-001');
        const { registerAuthMachineIdRoutes } = await import('./auth-machine-id.js');
        const app = Fastify();
        registerAuthMachineIdRoutes(app);
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/auth/machine-id',
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ machineId: 'machine-id-001' });
        await app.close();
    });
    it('supports machine_id compatibility path', async () => {
        machineIdMock.mockResolvedValue('machine-id-002');
        const { registerAuthMachineIdRoutes } = await import('./auth-machine-id.js');
        const app = Fastify();
        registerAuthMachineIdRoutes(app);
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/auth/machine_id',
        });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ machineId: 'machine-id-002' });
        await app.close();
    });
});
//# sourceMappingURL=auth-machine-id.test.js.map