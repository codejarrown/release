import { RealtimeBus } from './bus.js';
import { RealtimeStore, type AccountRealtimeState, type OrderGroupRealtimeState, type OrderGroupRemovePayload, type OrderRealtimeState, type QuoteRealtimeState, type SpreadRealtimeState, type SpreadRuntimeStatePayload, type RealtimeStoreSnapshot, type WsHeartBeatRealtimeState } from './store.js';
import type { SpreadSnapshotDto } from '../services/spread.service.js';
import type { OrderGroupDto } from '../services/order-group.service.js';
import type { DownstreamOrderUpdate, DownstreamOrderUpdateSnapshot, DownstreamQuote } from './mt5-source.js';
type RealtimeAppEventMap = {
    accountStatusUpdate: AccountRealtimeState;
    wsHeartBeat: WsHeartBeatRealtimeState;
    quoteUpdate: QuoteRealtimeState;
    orderUpdate: DownstreamOrderUpdate;
    orderUpdateSnapshot: DownstreamOrderUpdateSnapshot;
    orderStateUpdate: OrderRealtimeState;
    orderGroupUpdate: OrderGroupRealtimeState;
    orderGroupRemove: OrderGroupRemovePayload;
    spreadUpdate: SpreadRealtimeState;
    spreadHeartbeat: SpreadRealtimeState;
    spreadRuntimeState: SpreadRuntimeStatePayload;
};
export declare class RealtimeApp {
    readonly store: RealtimeStore;
    readonly bus: RealtimeBus;
    constructor(store?: RealtimeStore, bus?: RealtimeBus);
    on<EventName extends keyof RealtimeAppEventMap>(event: EventName, listener: (payload: RealtimeAppEventMap[EventName]) => void): this;
    once<EventName extends keyof RealtimeAppEventMap>(event: EventName, listener: (payload: RealtimeAppEventMap[EventName]) => void): this;
    off<EventName extends keyof RealtimeAppEventMap>(event: EventName, listener: (payload: RealtimeAppEventMap[EventName]) => void): this;
    getState(): RealtimeStore;
    getAccountSnapshot(): Pick<RealtimeStoreSnapshot, 'accounts'>;
    getWsHeartBeatSnapshot(): Pick<RealtimeStoreSnapshot, 'wsHeartBeats'>;
    getSnapshot(): RealtimeStoreSnapshot;
    listAccountStates(): AccountRealtimeState[];
    listWsHeartBeats(): WsHeartBeatRealtimeState[];
    listQuotes(): QuoteRealtimeState[];
    listOrderStates(): OrderRealtimeState[];
    listOrderGroups(): OrderGroupRealtimeState[];
    getOrderGroupSnapshot(): Pick<RealtimeStoreSnapshot, 'orderGroups'>;
    getRuntimeSubscriptionIds(): number[];
    getSpreadSnapshot(subscriptionId: number): SpreadSnapshotDto | null;
    markAccountConnected(accountId: number, sessionId: string): AccountRealtimeState;
    markAccountDisconnected(accountId: number, lastError?: string | null): AccountRealtimeState;
    markAccountError(accountId: number, message: string): AccountRealtimeState;
    upsertQuote(quote: DownstreamQuote): QuoteRealtimeState;
    syncWsHeartBeat(payload: {
        accountId: number;
        sessionId: string | null;
        latencyMs: number | null;
        host: string | null;
        port: number | null;
        error: string | null;
    }): WsHeartBeatRealtimeState;
    syncOrderSnapshot(payload: {
        accountId: number;
        sessionId: string;
        data?: unknown;
    }): OrderRealtimeState;
    syncOrderUpdate(payload: DownstreamOrderUpdate): OrderRealtimeState;
    syncOrderGroup(group: OrderGroupDto): OrderGroupRealtimeState | null;
    removeOrderGroup(groupId: number, accountGroupId?: number | null): OrderGroupRemovePayload;
    syncSpreadSnapshot(subscriptionId: number, accountGroupId: number, snapshot: SpreadSnapshotDto): SpreadRealtimeState;
    syncSpreadHeartbeat(payload: {
        subscriptionId: number;
        accountGroupId: number;
        accountAHeartbeat: number;
        accountBHeartbeat: number;
    }): SpreadRealtimeState;
    syncSpreadRuntimeState(payload: SpreadRuntimeStatePayload): SpreadRuntimeStatePayload;
    private saveAccountState;
    private syncOrderGroupsFromSnapshot;
}
export {};
//# sourceMappingURL=app.d.ts.map