import { RealtimeBus } from './bus.js';
import { RealtimeStore, } from './store.js';
export class RealtimeApp {
    store;
    bus;
    constructor(store = new RealtimeStore(), bus = new RealtimeBus()) {
        this.store = store;
        this.bus = bus;
    }
    on(event, listener) {
        this.bus.on(event, listener);
        return this;
    }
    once(event, listener) {
        this.bus.once(event, listener);
        return this;
    }
    off(event, listener) {
        this.bus.off(event, listener);
        return this;
    }
    getState() {
        return this.store;
    }
    getAccountSnapshot() {
        return {
            accounts: this.store.listAccounts(),
        };
    }
    getWsHeartBeatSnapshot() {
        return {
            wsHeartBeats: this.store.listWsHeartBeats(),
        };
    }
    getSnapshot() {
        return this.store.snapshot();
    }
    listAccountStates() {
        return this.store.listAccounts();
    }
    listWsHeartBeats() {
        return this.store.listWsHeartBeats();
    }
    listQuotes() {
        return this.store.listQuotes();
    }
    listOrderStates() {
        return this.store.listOrderStates();
    }
    listOrderGroups() {
        return this.store.listOrderGroups();
    }
    getOrderGroupSnapshot() {
        return {
            orderGroups: this.store.listOrderGroups(),
        };
    }
    getRuntimeSubscriptionIds() {
        return this.store.listRunningSpreadSubscriptionIds();
    }
    getSpreadSnapshot(subscriptionId) {
        return this.store.getSpreadSnapshot(subscriptionId);
    }
    markAccountConnected(accountId, sessionId) {
        this.syncWsHeartBeat({
            accountId,
            sessionId,
            latencyMs: null,
            host: null,
            port: null,
            error: null,
        });
        return this.saveAccountState({
            accountId,
            status: 'connected',
            sessionId,
            lastError: null,
            updatedAt: new Date().toISOString(),
        });
    }
    markAccountDisconnected(accountId, lastError = null) {
        this.syncWsHeartBeat({
            accountId,
            sessionId: null,
            latencyMs: null,
            host: null,
            port: null,
            error: null,
        });
        return this.saveAccountState({
            accountId,
            status: 'disconnected',
            sessionId: null,
            lastError,
            updatedAt: new Date().toISOString(),
        });
    }
    markAccountError(accountId, message) {
        const existing = this.store.getAccount(accountId);
        this.syncWsHeartBeat({
            accountId,
            sessionId: existing?.sessionId ?? null,
            latencyMs: null,
            host: null,
            port: null,
            error: message,
        });
        return this.saveAccountState({
            accountId,
            status: 'error',
            sessionId: existing?.sessionId ?? null,
            lastError: message,
            updatedAt: new Date().toISOString(),
        });
    }
    upsertQuote(quote) {
        const saved = this.store.upsertQuote({
            ...quote,
            updatedAt: new Date().toISOString(),
        });
        this.bus.emitQuoteUpdate(saved);
        return saved;
    }
    syncWsHeartBeat(payload) {
        const saved = this.store.upsertWsHeartBeat({
            ...payload,
            updatedAt: new Date().toISOString(),
        });
        this.bus.emitWsHeartBeat(saved);
        return saved;
    }
    syncOrderSnapshot(payload) {
        const orders = normalizeOrderSnapshotData(payload.data);
        const updatedAt = new Date().toISOString();
        const saved = this.store.upsertOrderSnapshot({
            accountId: payload.accountId,
            sessionId: payload.sessionId,
            orders,
            updatedAt,
        });
        this.bus.emitOrderUpdateSnapshot({
            accountId: payload.accountId,
            sessionId: payload.sessionId,
            data: orders,
        });
        this.bus.emitOrderStateUpdate(saved);
        this.syncOrderGroupsFromSnapshot(payload.accountId, orders, updatedAt);
        return saved;
    }
    syncOrderUpdate(payload) {
        const existing = this.store.getOrderState(payload.accountId);
        const saved = this.store.upsertOrderSnapshot({
            accountId: payload.accountId,
            sessionId: payload.sessionId,
            orders: mergeOrders(existing?.orders ?? [], payload.order),
            updatedAt: new Date().toISOString(),
        });
        this.bus.emitOrderUpdate(payload);
        this.bus.emitOrderStateUpdate(saved);
        return saved;
    }
    syncOrderGroup(group) {
        if (!shouldKeepOrderGroupInRuntime(group)) {
            const existing = this.store.getOrderGroup(group.id);
            if (!existing)
                return null;
            const removed = {
                groupId: group.id,
                accountGroupId: group.accountGroupId,
            };
            this.store.removeOrderGroup(group.id);
            this.bus.emitOrderGroupRemove(removed);
            return null;
        }
        const saved = this.store.upsertOrderGroup({
            group,
            updatedAt: new Date().toISOString(),
        });
        this.bus.emitOrderGroupUpdate(saved);
        return saved;
    }
    removeOrderGroup(groupId, accountGroupId = null) {
        const existing = this.store.getOrderGroup(groupId);
        this.store.removeOrderGroup(groupId);
        const payload = {
            groupId,
            accountGroupId: existing?.group.accountGroupId ?? accountGroupId,
        };
        this.bus.emitOrderGroupRemove(payload);
        return payload;
    }
    syncSpreadSnapshot(subscriptionId, accountGroupId, snapshot) {
        const existing = this.store.getSpread(subscriptionId);
        const saved = this.store.upsertSpread({
            subscriptionId,
            accountGroupId,
            runtimeStarted: true,
            snapshot,
            accountAHeartbeat: snapshot.accountAQuote?.heartbeat ?? existing?.accountAHeartbeat ?? 0,
            accountBHeartbeat: snapshot.accountBQuote?.heartbeat ?? existing?.accountBHeartbeat ?? 0,
            updatedAt: new Date().toISOString(),
        });
        this.bus.emitSpreadUpdate(saved);
        return saved;
    }
    syncSpreadHeartbeat(payload) {
        const existing = this.store.getSpread(payload.subscriptionId);
        const snapshot = existing?.snapshot
            ? {
                ...existing.snapshot,
                accountAQuote: existing.snapshot.accountAQuote
                    ? { ...existing.snapshot.accountAQuote, heartbeat: payload.accountAHeartbeat }
                    : null,
                accountBQuote: existing.snapshot.accountBQuote
                    ? { ...existing.snapshot.accountBQuote, heartbeat: payload.accountBHeartbeat }
                    : null,
            }
            : null;
        const saved = this.store.upsertSpread({
            subscriptionId: payload.subscriptionId,
            accountGroupId: payload.accountGroupId,
            runtimeStarted: true,
            snapshot,
            accountAHeartbeat: payload.accountAHeartbeat,
            accountBHeartbeat: payload.accountBHeartbeat,
            updatedAt: new Date().toISOString(),
        });
        this.bus.emitSpreadHeartbeat(saved);
        return saved;
    }
    syncSpreadRuntimeState(payload) {
        if (!payload.runtimeStarted) {
            this.store.removeSpread(payload.subscriptionId);
        }
        else if (!this.store.getSpread(payload.subscriptionId)) {
            this.store.upsertSpread({
                ...payload,
                snapshot: null,
                accountAHeartbeat: 0,
                accountBHeartbeat: 0,
                updatedAt: new Date().toISOString(),
            });
        }
        this.bus.emitSpreadRuntimeState(payload);
        return payload;
    }
    saveAccountState(next) {
        const saved = this.store.upsertAccount(next);
        this.bus.emitAccountStatusUpdate(saved);
        return saved;
    }
    syncOrderGroupsFromSnapshot(accountId, orders, updatedAt) {
        const liveOrdersByTicket = new Map();
        for (const order of orders) {
            if (typeof order.ticket === 'number') {
                liveOrdersByTicket.set(order.ticket, order);
            }
        }
        for (const state of this.store.listOrderGroups()) {
            const nextGroup = applyLiveOrderSnapshotToGroup(state.group, accountId, liveOrdersByTicket, updatedAt);
            if (!nextGroup)
                continue;
            const saved = this.store.upsertOrderGroup({
                group: nextGroup,
                updatedAt,
            });
            this.bus.emitOrderGroupUpdate(saved);
        }
    }
}
function mergeOrders(existing, next) {
    if (next.ticket === undefined || next.ticket === null) {
        return [...existing, next];
    }
    const index = existing.findIndex((order) => order.ticket === next.ticket);
    if (index < 0) {
        return [...existing, next];
    }
    const merged = [...existing];
    merged[index] = next;
    return merged;
}
function normalizeOrderSnapshotData(data) {
    if (Array.isArray(data)) {
        return [...data];
    }
    if (data && typeof data === 'object') {
        const record = data;
        if (Array.isArray(record.data)) {
            return [...record.data];
        }
        if (Array.isArray(record.orders)) {
            return [...record.orders];
        }
        if (Array.isArray(record.items)) {
            return [...record.items];
        }
    }
    return [];
}
function applyLiveOrderSnapshotToGroup(group, accountId, liveOrdersByTicket, updatedAt) {
    let changed = false;
    const items = group.items.map((item) => {
        if (item.accountId !== accountId || item.status !== 'open' || typeof item.ticket !== 'number') {
            return item;
        }
        const liveOrder = liveOrdersByTicket.get(item.ticket);
        if (!liveOrder) {
            return item;
        }
        const nextProfit = normalizeOptionalNumber(liveOrder.profit, item.profit);
        const nextOpenPrice = normalizeOptionalNumber(liveOrder.openPrice, item.openPrice);
        const nextClosePrice = normalizeOptionalNumber(liveOrder.closePrice, item.closePrice);
        if (Object.is(nextProfit, item.profit)
            && Object.is(nextOpenPrice, item.openPrice)
            && Object.is(nextClosePrice, item.closePrice)) {
            return item;
        }
        changed = true;
        return {
            ...item,
            profit: nextProfit,
            openPrice: nextOpenPrice,
            closePrice: nextClosePrice,
        };
    });
    if (!changed) {
        return null;
    }
    return {
        ...group,
        totalProfit: roundTo2(items.reduce((sum, item) => sum + (item.profit ?? 0), 0)),
        openCount: items.filter((item) => item.status === 'open').length,
        closedCount: items.filter((item) => item.status === 'closed').length,
        itemCount: items.length,
        updatedAt,
        items,
    };
}
function normalizeOptionalNumber(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (value === null) {
        return null;
    }
    return fallback;
}
function roundTo2(value) {
    return Math.round(value * 100) / 100;
}
function shouldKeepOrderGroupInRuntime(group) {
    return !group.isFullyClosed && group.itemCount > 0;
}
//# sourceMappingURL=app.js.map