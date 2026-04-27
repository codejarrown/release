import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerUtilitiesRoutes } from './utilities.js';
describe('registerUtilitiesRoutes', () => {
    it('proxies ping requests', async () => {
        const app = Fastify();
        const mt5Sdk = {
            utilities: {
                ping: vi.fn(async () => ({ latencyMs: 42 })),
            },
        };
        registerUtilitiesRoutes(app, mt5Sdk);
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/utils/ping',
            payload: {
                host: 'demo.example.com',
                port: 443,
            },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            data: {
                latencyMs: 42,
            },
        });
        expect(mt5Sdk.utilities.ping).toHaveBeenCalledWith({
            host: 'demo.example.com',
            port: 443,
        });
        await app.close();
    });
    it('returns flattened server fields and normalizes address objects', async () => {
        const app = Fastify();
        const mt5Sdk = {
            utilities: {
                ping: vi.fn(),
                loadDefaultServersDat: vi.fn(async () => ([
                    {
                        serverInfoEx: {
                            serverName: 'Broker A',
                            companyName: 'Broker Co',
                            address: 'primary.example.com:443',
                        },
                        accesses: [
                            {
                                addresses: [
                                    { address: 'demo.example.com:443' },
                                    { address: 'backup.example.com:443' },
                                ],
                            },
                        ],
                        accessesEx: [
                            {
                                addresses: ['legacy.example.com:443'],
                            },
                        ],
                    },
                ])),
            },
        };
        registerUtilitiesRoutes(app, mt5Sdk);
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/utils/servers/load/default',
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            data: [
                {
                    serverName: 'Broker A',
                    companyName: 'Broker Co',
                    address: 'primary.example.com:443',
                    addresses: [
                        'demo.example.com:443',
                        'backup.example.com:443',
                        'legacy.example.com:443',
                    ],
                },
            ],
        });
        await app.close();
    });
});
//# sourceMappingURL=utilities.test.js.map