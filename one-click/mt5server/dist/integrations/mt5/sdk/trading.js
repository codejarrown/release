export class TradingApi {
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
    async orderSend(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/trading/orders/send`, body);
        return res.body;
    }
    async orderClose(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/trading/orders/close`, body);
        return res.body;
    }
    async orderModify(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/trading/orders/modify`, body);
        return res.body;
    }
    async getOpenedOrders(opts) {
        const sid = this.sid(opts?.sessionId);
        const res = await this.client.get(`/api/${sid}/trading/orders/opened`, {
            sort: opts?.sort,
            ascending: opts?.ascending,
        });
        return res.body;
    }
    async getOpenedOrder(ticket, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/trading/orders/opened/${ticket}`);
        return res.body;
    }
    async getClosedOrders(sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/trading/orders/closed`);
        return res.body;
    }
}
//# sourceMappingURL=trading.js.map