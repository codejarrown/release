export class CalculationsApi {
    client;
    sessionId;
    constructor(client, sessionId) {
        this.client = client;
        this.sessionId = sessionId;
    }
    sid(sessionId) {
        const id = sessionId ?? this.sessionId;
        if (!id)
            throw new Error('sessionId is required');
        return id;
    }
    async calcRequiredMargin(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/calc/requiredMargin`, body);
        return res.body.requiredMargin;
    }
    async calcOrderProfit(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/calc/orderProfit`, body);
        return res.body.profit;
    }
    async updateProfits(sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/calc/updateProfits`);
        return res.body;
    }
}
//# sourceMappingURL=calculations.js.map