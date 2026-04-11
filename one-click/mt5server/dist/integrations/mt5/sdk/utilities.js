export class UtilitiesApi {
    client;
    constructor(client) {
        this.client = client;
    }
    async ping(body) {
        const res = await this.client.post('/api/utils/ping', body);
        return res.body;
    }
    async loadDefaultServersDat() {
        const res = await this.client.get('/api/utils/servers/load/default');
        return res.body;
    }
    async loadServersDat(path) {
        const res = await this.client.post('/api/utils/servers/load', { path });
        return res.body;
    }
    async saveServersDat(servers) {
        const res = await this.client.post('/api/utils/servers/save', servers);
        return res.body;
    }
    async requestDemoAccount(body) {
        const res = await this.client.post('/api/utils/demo-account', body);
        return res.body;
    }
}
//# sourceMappingURL=utilities.js.map