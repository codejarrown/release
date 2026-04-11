import { HttpClientError } from '../../../lib/errors.js';
export class SessionApi {
    client;
    constructor(client) {
        this.client = client;
    }
    async connectByAddress(body) {
        const res = await this.client.post('/api/session/connect/address', body);
        return res.body;
    }
    async connectByServer(body) {
        const res = await this.client.post('/api/session/connect/server', body);
        return res.body;
    }
    async list() {
        const res = await this.client.get('/api/session/');
        return res.body;
    }
    async get(sessionId) {
        const res = await this.client.get(`/api/session/${sessionId}`);
        return res.body;
    }
    async ping(sessionId) {
        try {
            const res = await this.client.get(`/api/${sessionId}/ping`);
            return res.body;
        }
        catch (error) {
            if (!(error instanceof HttpClientError) || error.statusCode !== 404) {
                throw error;
            }
            try {
                // Compatibility fallback for transitional builds that expose
                // this endpoint under /api/session/{sessionId}/ping.
                const res = await this.client.get(`/api/session/${sessionId}/ping`);
                return res.body;
            }
            catch (fallbackError) {
                if (!(fallbackError instanceof HttpClientError) || fallbackError.statusCode !== 404) {
                    throw fallbackError;
                }
                // Compatibility fallback for older MT5API builds that mistakenly exposed
                // this endpoint under /api/session/api/{sessionId}/ping.
                const res = await this.client.get(`/api/session/api/${sessionId}/ping`);
                return res.body;
            }
        }
    }
    async disconnect(sessionId) {
        const res = await this.client.delete(`/api/session/${sessionId}`);
        return res.body;
    }
    async changePassword(sessionId, body) {
        const res = await this.client.post(`/api/session/${sessionId}/password`, body);
        return res.body;
    }
}
//# sourceMappingURL=session.js.map