export class HistoryApi {
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
    // ===== Orders =====
    async downloadOrderHistory(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/orders/download`, body);
        return res.body;
    }
    async downloadOrderHistorySync(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/orders/download/sync`, body);
        return res.body;
    }
    async downloadPendingOrderHistory(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/orders/pending/download`, body);
        return res.body;
    }
    async requestOrderHistory(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/orders/request`, body);
        return res.body;
    }
    async requestPendingOrderHistory(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/orders/pending/request`, body);
        return res.body;
    }
    // ===== Quotes (K-line) =====
    async downloadQuoteHistory(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/quotes/download`, body);
        return res.body;
    }
    async downloadQuoteHistoryAsync(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/quotes/download/async`, body);
        return res.body;
    }
    async downloadQuoteHistoryMonth(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/quotes/download/month`, body);
        return res.body;
    }
    async downloadQuoteHistoryMonthAsync(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/quotes/download/month/async`, body);
        return res.body;
    }
    async downloadQuoteHistoryToday(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/quotes/download/today`, body);
        return res.body;
    }
    async downloadQuoteHistoryTodayAsync(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/quotes/download/today/async`, body);
        return res.body;
    }
    async requestQuoteHistoryMonth(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/quotes/request/month`, body);
        return res.body;
    }
    async requestQuoteHistoryToday(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/quotes/request/today`, body);
        return res.body;
    }
    // ===== Ticks =====
    async requestTickHistory(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/ticks/request`, body);
        return res.body;
    }
    async stopTickHistory(body, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/history/ticks/stop`, body);
        return res.body;
    }
}
//# sourceMappingURL=history.js.map