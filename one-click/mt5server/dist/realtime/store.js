export class RealtimeStore {
    accounts = new Map();
    wsHeartBeats = new Map();
    quotes = new Map();
    orders = new Map();
    orderGroups = new Map();
    spreads = new Map();
    upsertAccount(state) {
        this.accounts.set(state.accountId, state);
        return state;
    }
    getAccount(accountId) {
        return this.accounts.get(accountId) ?? null;
    }
    listAccounts() {
        return [...this.accounts.values()].sort((a, b) => a.accountId - b.accountId);
    }
    upsertWsHeartBeat(state) {
        this.wsHeartBeats.set(state.accountId, state);
        return state;
    }
    getWsHeartBeat(accountId) {
        return this.wsHeartBeats.get(accountId) ?? null;
    }
    listWsHeartBeats() {
        return [...this.wsHeartBeats.values()].sort((a, b) => a.accountId - b.accountId);
    }
    upsertQuote(state) {
        this.quotes.set(quoteKey(state.accountId, state.symbol), state);
        return state;
    }
    getQuote(accountId, symbol) {
        return this.quotes.get(quoteKey(accountId, symbol)) ?? null;
    }
    listQuotes() {
        return [...this.quotes.values()].sort((a, b) => {
            if (a.accountId !== b.accountId)
                return a.accountId - b.accountId;
            return a.symbol.localeCompare(b.symbol);
        });
    }
    upsertOrderSnapshot(state) {
        this.orders.set(state.accountId, state);
        return state;
    }
    getOrderState(accountId) {
        return this.orders.get(accountId) ?? null;
    }
    listOrderStates() {
        return [...this.orders.values()].sort((a, b) => a.accountId - b.accountId);
    }
    upsertOrderGroup(state) {
        this.orderGroups.set(state.group.id, state);
        return state;
    }
    getOrderGroup(groupId) {
        return this.orderGroups.get(groupId) ?? null;
    }
    listOrderGroups() {
        return [...this.orderGroups.values()].sort((a, b) => b.group.id - a.group.id);
    }
    removeOrderGroup(groupId) {
        this.orderGroups.delete(groupId);
    }
    upsertSpread(state) {
        this.spreads.set(state.subscriptionId, state);
        return state;
    }
    getSpread(subscriptionId) {
        return this.spreads.get(subscriptionId) ?? null;
    }
    getSpreadSnapshot(subscriptionId) {
        return this.spreads.get(subscriptionId)?.snapshot ?? null;
    }
    listSpreads() {
        return [...this.spreads.values()].sort((a, b) => a.subscriptionId - b.subscriptionId);
    }
    listRunningSpreadSubscriptionIds() {
        return this.listSpreads()
            .filter((state) => state.runtimeStarted)
            .map((state) => state.subscriptionId);
    }
    removeSpread(subscriptionId) {
        this.spreads.delete(subscriptionId);
    }
    snapshot() {
        return {
            accounts: this.listAccounts(),
            wsHeartBeats: this.listWsHeartBeats(),
            quotes: this.listQuotes(),
            orders: this.listOrderStates(),
            orderGroups: this.listOrderGroups(),
            spreads: this.listSpreads(),
        };
    }
}
function quoteKey(accountId, symbol) {
    return `${accountId}:${symbol}`;
}
//# sourceMappingURL=store.js.map