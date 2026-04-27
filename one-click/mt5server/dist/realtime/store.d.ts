import type { SpreadSnapshotDto } from '../services/spread.service.js';
import type { OrderGroupDto } from '../services/order-group.service.js';
import type { DownstreamOrderUpdateSnapshot, DownstreamQuote } from './mt5-source.js';
export type AccountRealtimeStatus = 'connected' | 'disconnected' | 'error';
export interface AccountRealtimeState {
    accountId: number;
    status: AccountRealtimeStatus;
    sessionId: string | null;
    lastError: string | null;
    updatedAt: string;
}
export interface WsHeartBeatRealtimeState {
    accountId: number;
    sessionId: string | null;
    latencyMs: number | null;
    host: string | null;
    port: number | null;
    error: string | null;
    updatedAt: string;
}
export interface RealtimeStoreSnapshot {
    accounts: AccountRealtimeState[];
    wsHeartBeats: WsHeartBeatRealtimeState[];
    quotes: QuoteRealtimeState[];
    orders: OrderRealtimeState[];
    orderGroups: OrderGroupRealtimeState[];
    spreads: SpreadRealtimeState[];
}
export interface QuoteRealtimeState extends DownstreamQuote {
    updatedAt: string;
}
export interface SpreadRuntimeStatePayload {
    subscriptionId: number;
    accountGroupId: number;
    runtimeStarted: boolean;
}
export interface SpreadRealtimeState extends SpreadRuntimeStatePayload {
    snapshot: SpreadSnapshotDto | null;
    accountAHeartbeat: number;
    accountBHeartbeat: number;
    updatedAt: string;
}
export interface OrderRealtimeState {
    accountId: number;
    sessionId: string;
    orders: DownstreamOrderUpdateSnapshot['data'];
    updatedAt: string;
}
export interface OrderGroupRealtimeState {
    group: OrderGroupDto;
    updatedAt: string;
}
export interface OrderGroupRemovePayload {
    groupId: number;
    accountGroupId: number | null;
}
export declare class RealtimeStore {
    private readonly accounts;
    private readonly wsHeartBeats;
    private readonly quotes;
    private readonly orders;
    private readonly orderGroups;
    private readonly spreads;
    upsertAccount(state: AccountRealtimeState): AccountRealtimeState;
    getAccount(accountId: number): AccountRealtimeState | null;
    listAccounts(): AccountRealtimeState[];
    upsertWsHeartBeat(state: WsHeartBeatRealtimeState): WsHeartBeatRealtimeState;
    getWsHeartBeat(accountId: number): WsHeartBeatRealtimeState | null;
    listWsHeartBeats(): WsHeartBeatRealtimeState[];
    upsertQuote(state: QuoteRealtimeState): QuoteRealtimeState;
    getQuote(accountId: number, symbol: string): QuoteRealtimeState | null;
    listQuotes(): QuoteRealtimeState[];
    upsertOrderSnapshot(state: OrderRealtimeState): OrderRealtimeState;
    getOrderState(accountId: number): OrderRealtimeState | null;
    listOrderStates(): OrderRealtimeState[];
    upsertOrderGroup(state: OrderGroupRealtimeState): OrderGroupRealtimeState;
    getOrderGroup(groupId: number): OrderGroupRealtimeState | null;
    listOrderGroups(): OrderGroupRealtimeState[];
    removeOrderGroup(groupId: number): void;
    upsertSpread(state: SpreadRealtimeState): SpreadRealtimeState;
    getSpread(subscriptionId: number): SpreadRealtimeState | null;
    getSpreadSnapshot(subscriptionId: number): SpreadSnapshotDto | null;
    listSpreads(): SpreadRealtimeState[];
    listRunningSpreadSubscriptionIds(): number[];
    removeSpread(subscriptionId: number): void;
    snapshot(): RealtimeStoreSnapshot;
}
//# sourceMappingURL=store.d.ts.map