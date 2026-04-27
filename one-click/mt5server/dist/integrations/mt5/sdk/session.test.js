import { describe, it, expect, vi } from 'vitest';
import { SessionApi } from './session.js';
import { HttpClientError } from '../../../lib/errors.js';
function createMockClient(responses) {
    const handler = async (method, path, _body) => {
        const key = `${method} ${path}`;
        const match = responses[key];
        if (!match)
            throw new Error(`No mock for ${key}`);
        return {
            statusCode: match.statusCode ?? 200,
            headers: { 'content-type': 'application/json' },
            body: match.body,
        };
    };
    return {
        get: vi.fn(async (path) => handler('GET', path)),
        post: vi.fn(async (path, body) => handler('POST', path, body)),
        put: vi.fn(async (path, body) => handler('PUT', path, body)),
        delete: vi.fn(async (path) => handler('DELETE', path)),
    };
}
describe('SessionApi', () => {
    it('connectByAddress returns sessionId', async () => {
        const client = createMockClient({
            'POST /api/session/connect/address': {
                body: { sessionId: 'sess-123', connected: true, account: { login: 100, userName: 'Test', balance: 1000 } },
            },
        });
        const api = new SessionApi(client);
        const result = await api.connectByAddress({
            user: 100,
            password: 'pass',
            host: '1.2.3.4',
            port: 443,
            timeoutMs: 30000,
        });
        expect(result.sessionId).toBe('sess-123');
        expect(result.connected).toBe(true);
        expect(result.account?.login).toBe(100);
    });
    it('connectByServer returns sessionId', async () => {
        const client = createMockClient({
            'POST /api/session/connect/server': {
                body: { sessionId: 'sess-456', connected: true },
            },
        });
        const api = new SessionApi(client);
        const result = await api.connectByServer({
            user: 200,
            password: 'pass',
            serverName: 'Broker-Live',
            timeoutMs: 30000,
        });
        expect(result.sessionId).toBe('sess-456');
        expect(result.connected).toBe(true);
    });
    it('list returns session list', async () => {
        const client = createMockClient({
            'GET /api/session/': {
                body: { activeCount: 2, sessionIds: ['sess-1', 'sess-2'] },
            },
        });
        const api = new SessionApi(client);
        const result = await api.list();
        expect(result.activeCount).toBe(2);
        expect(result.sessionIds).toEqual(['sess-1', 'sess-2']);
    });
    it('get returns session info', async () => {
        const client = createMockClient({
            'GET /api/session/sess-123': {
                body: { sessionId: 'sess-123', connected: true, server: 'Broker-Live' },
            },
        });
        const api = new SessionApi(client);
        const result = await api.get('sess-123');
        expect(result.sessionId).toBe('sess-123');
        expect(result.server).toBe('Broker-Live');
    });
    it('disconnect returns success', async () => {
        const client = createMockClient({
            'DELETE /api/session/sess-123': { body: { success: true } },
        });
        const api = new SessionApi(client);
        const result = await api.disconnect('sess-123');
        expect(result.success).toBe(true);
    });
    it('throws HttpClientError on failed connect', async () => {
        const client = {
            post: vi.fn(async () => {
                throw new HttpClientError('Connection failed', 500, 'internal_error', {
                    error: 'internal_error',
                    message: 'Connection failed',
                });
            }),
            get: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
        };
        const api = new SessionApi(client);
        await expect(api.connectByAddress({
            user: 100,
            password: 'wrong',
            host: '1.2.3.4',
            port: 443,
            timeoutMs: 30000,
        })).rejects.toThrow(HttpClientError);
    });
});
//# sourceMappingURL=session.test.js.map