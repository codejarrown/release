export class SubscriptionsApi {
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
    async subscribe(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/subscriptions/subscribe`, body);
        return res.body;
    }
    async subscribeMultiple(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/subscriptions/subscribe/multiple`, body);
        return res.body;
    }
    async subscribeForce(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/subscriptions/subscribe/force`, body);
        return res.body;
    }
    async unsubscribe(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/subscriptions/unsubscribe`, body);
        return res.body;
    }
    async unsubscribeMultiple(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/subscriptions/unsubscribe/multiple`, body);
        return res.body;
    }
    async getSubscriptions(sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/subscriptions/`);
        return res.body.subscriptions;
    }
    async isSubscribed(symbol, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/subscriptions/isSubscribed/${symbol}`);
        return res.body.isSubscribed;
    }
    async subscribeOrderBook(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/subscriptions/orderBook/subscribe`, body);
        return res.body;
    }
    async unsubscribeOrderBook(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/subscriptions/orderBook/unsubscribe`, body);
        return res.body;
    }
}
//# sourceMappingURL=subscriptions.js.map