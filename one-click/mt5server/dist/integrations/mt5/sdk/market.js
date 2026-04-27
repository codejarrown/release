export class MarketApi {
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
    async getQuote(symbol, opts) {
        const sid = this.sid(opts?.sessionId);
        const res = await this.client.get(`/api/${sid}/market/quote/${symbol}`, {
            timeoutMs: opts?.timeoutMs,
        });
        return res.body;
    }
    async getQuoteSync(symbol, opts) {
        const sid = this.sid(opts?.sessionId);
        const res = await this.client.get(`/api/${sid}/market/quote/${symbol}/sync`, {
            timeoutMs: opts?.timeoutMs,
            msNotOlder: opts?.msNotOlder,
        });
        return res.body;
    }
    async getMarketWatch(symbol, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/watch/${symbol}`);
        return res.body;
    }
    async getSymbolNames(sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/symbols`);
        return res.body;
    }
    async getSymbolInfo(symbol, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/symbols/${symbol}/info`);
        return res.body;
    }
    async getSymbolGroup(symbol, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/symbols/${symbol}/group`);
        return res.body;
    }
    async symbolExists(symbol, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/symbols/${symbol}/exists`);
        return res.body.exists;
    }
    async getContractSize(symbol, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/symbols/${symbol}/contractSize`);
        return res.body.contractSize;
    }
    async getTickSize(symbol, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/symbols/${symbol}/tickSize`);
        return res.body.tickSize;
    }
    async getTickValue(symbol, opts) {
        const sid = this.sid(opts?.sessionId);
        const res = await this.client.get(`/api/${sid}/market/symbols/${symbol}/tickValue`, { timeoutMs: opts?.timeoutMs });
        return res.body.tickValue;
    }
    async isQuoteSession(symbol, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/symbols/${symbol}/sessions/quote`);
        return res.body.isQuoteSession;
    }
    async isTradeSession(symbol, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/symbols/${symbol}/sessions/trade`);
        return res.body.isTradeSession;
    }
    async getServerTime(sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/serverTime`);
        return res.body;
    }
    async getClusterDetails(sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/market/cluster`);
        return res.body;
    }
}
//# sourceMappingURL=market.js.map