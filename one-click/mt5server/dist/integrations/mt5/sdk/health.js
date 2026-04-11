export class HealthApi {
    client;
    constructor(client) {
        this.client = client;
    }
    async check() {
        const res = await this.client.get('/health');
        return res.body;
    }
}
//# sourceMappingURL=health.js.map