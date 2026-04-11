import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from './http-client.js';
import { HttpClientError, TimeoutError } from './errors.js';
function mockFetch(response) {
    const { status = 200, statusText = 'OK', json, headers = {}, delay = 0 } = response;
    return vi.fn(async (_url, init) => {
        if (delay) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            if (init?.signal?.aborted)
                throw new DOMException('The operation was aborted.', 'AbortError');
        }
        const hdrs = new Headers({ 'content-type': 'application/json', ...headers });
        return {
            ok: status >= 200 && status < 300,
            status,
            statusText,
            headers: hdrs,
            json: async () => json,
            text: async () => JSON.stringify(json),
        };
    });
}
describe('HttpClient', () => {
    let originalFetch;
    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });
    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });
    it('GET request returns body on 200', async () => {
        globalThis.fetch = mockFetch({ json: { status: 'ok' } });
        const client = new HttpClient({ baseUrl: 'http://localhost:5050' });
        const res = await client.get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });
    it('POST request sends body', async () => {
        const fetchMock = mockFetch({ json: { sessionId: 'abc', connected: true } });
        globalThis.fetch = fetchMock;
        const client = new HttpClient({ baseUrl: 'http://localhost:5050' });
        const res = await client.post('/api/session/connect/address', {
            user: 123,
            password: 'test',
            host: '1.2.3.4',
            port: 443,
        });
        expect(res.body).toEqual({ sessionId: 'abc', connected: true });
        const calledInit = fetchMock.mock.calls[0][1];
        expect(JSON.parse(calledInit.body)).toEqual({
            user: 123,
            password: 'test',
            host: '1.2.3.4',
            port: 443,
        });
    });
    it('throws HttpClientError on 4xx', async () => {
        globalThis.fetch = mockFetch({
            status: 404,
            statusText: 'Not Found',
            json: { error: 'not_found', message: 'Session not found' },
        });
        const client = new HttpClient({ baseUrl: 'http://localhost:5050' });
        await expect(client.get('/api/session/xyz')).rejects.toThrow(HttpClientError);
        try {
            await client.get('/api/session/xyz');
        }
        catch (err) {
            const e = err;
            expect(e.statusCode).toBe(404);
            expect(e.code).toBe('not_found');
            expect(e.isClientError).toBe(true);
            expect(e.isRetryable).toBe(false);
        }
    });
    it('throws HttpClientError on 5xx', async () => {
        globalThis.fetch = mockFetch({
            status: 500,
            statusText: 'Internal Server Error',
            json: { error: 'internal_error', message: 'Something broke' },
        });
        const client = new HttpClient({ baseUrl: 'http://localhost:5050' });
        await expect(client.get('/health')).rejects.toThrow(HttpClientError);
        try {
            await client.get('/health');
        }
        catch (err) {
            const e = err;
            expect(e.statusCode).toBe(500);
            expect(e.isServerError).toBe(true);
            expect(e.isRetryable).toBe(true);
        }
    });
    it('throws TimeoutError when request exceeds timeout', async () => {
        globalThis.fetch = mockFetch({ json: {}, delay: 200 });
        const client = new HttpClient({ baseUrl: 'http://localhost:5050', timeout: 50 });
        await expect(client.get('/slow')).rejects.toThrow(TimeoutError);
    });
    it('retries GET on 5xx up to retries limit', async () => {
        let callCount = 0;
        globalThis.fetch = vi.fn(async () => {
            callCount++;
            if (callCount < 3) {
                const hdrs = new Headers({ 'content-type': 'application/json' });
                return {
                    ok: false,
                    status: 500,
                    statusText: 'err',
                    headers: hdrs,
                    json: async () => ({ error: 'internal_error', message: 'fail' }),
                    text: async () => '{}',
                };
            }
            const hdrs = new Headers({ 'content-type': 'application/json' });
            return {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: hdrs,
                json: async () => ({ ok: true }),
                text: async () => '{}',
            };
        });
        const client = new HttpClient({
            baseUrl: 'http://localhost:5050',
            retries: 2,
            retryDelay: 10,
        });
        const res = await client.get('/flaky');
        expect(res.body).toEqual({ ok: true });
        expect(callCount).toBe(3);
    });
    it('does not retry POST requests', async () => {
        let callCount = 0;
        globalThis.fetch = vi.fn(async () => {
            callCount++;
            const hdrs = new Headers({ 'content-type': 'application/json' });
            return {
                ok: false,
                status: 500,
                statusText: 'err',
                headers: hdrs,
                json: async () => ({ error: 'internal_error', message: 'fail' }),
                text: async () => '{}',
            };
        });
        const client = new HttpClient({
            baseUrl: 'http://localhost:5050',
            retries: 2,
            retryDelay: 10,
        });
        await expect(client.post('/data', {})).rejects.toThrow(HttpClientError);
        expect(callCount).toBe(1);
    });
    it('builds URL with query parameters', async () => {
        const fetchMock = mockFetch({ json: {} });
        globalThis.fetch = fetchMock;
        const client = new HttpClient({ baseUrl: 'http://localhost:5050' });
        await client.get('/api/test', { foo: 'bar', num: 42, skip: undefined });
        const calledUrl = fetchMock.mock.calls[0][0];
        expect(calledUrl).toContain('foo=bar');
        expect(calledUrl).toContain('num=42');
        expect(calledUrl).not.toContain('skip');
    });
});
//# sourceMappingURL=http-client.test.js.map