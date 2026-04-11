import { EventEmitter } from 'node:events';
import type { ISpreadSubscriptionRepository } from '../db/repositories/spread-subscription.repository.js';
import type { IAccountGroupRepository } from '../db/repositories/account-group.repository.js';
import type { DownstreamQuote, WsConnectionManager } from './ws-manager.js';
import type { PushService } from './push/index.js';
import type { OrderGroupService, OrderGroupDto } from './order-group.service.js';
import type { Mt5ApiSdk } from '../integrations/mt5/sdk/index.js';
export type SpreadTradeDirection = 'sellA_buyB' | 'sellB_buyA';
export type SpreadStatus = 'ready' | 'waiting_quote' | 'disabled';
export type SpreadChartTimeframeMinutes = 1 | 5 | 15;
export interface SpreadSubscriptionDto {
    id: number;
    accountGroupId: number;
    name: string;
    symbolA: string;
    symbolB: string;
    lotsA: number;
    lotsB: number | null;
    isEnabled: boolean;
    runtimeStarted: boolean;
    notifyEnabled: boolean;
    notifyChannelIds: number[];
    notifyLongThreshold: number | null;
    notifyShortThreshold: number | null;
    notifyStabilitySeconds: number;
    cooldownSeconds: number;
    createdAt: string;
    updatedAt: string;
}
export interface CreateSpreadSubscriptionInput {
    name: string;
    symbolA: string;
    symbolB: string;
    lotsA?: number;
    lotsB?: number | null;
    isEnabled?: boolean;
    notifyEnabled?: boolean;
    notifyChannelIds?: number[];
    notifyLongThreshold?: number;
    notifyShortThreshold?: number;
    notifyStabilitySeconds?: number;
    cooldownSeconds?: number;
}
export interface UpdateSpreadSubscriptionInput {
    name?: string;
    symbolA?: string;
    symbolB?: string;
    lotsA?: number;
    lotsB?: number | null;
    isEnabled?: boolean;
    notifyEnabled?: boolean;
    notifyChannelIds?: number[];
    notifyLongThreshold?: number | null;
    notifyShortThreshold?: number | null;
    notifyStabilitySeconds?: number;
    cooldownSeconds?: number;
}
export interface SpreadQuoteDto {
    accountId: number;
    login: number;
    label: string | null;
    symbol: string;
    bid: number;
    ask: number;
    time: string;
    heartbeat: number;
}
export interface SpreadStabilityDto {
    isLongStable: boolean;
    isShortStable: boolean;
    longStableMs: number;
    shortStableMs: number;
    longStableSeconds: number;
    shortStableSeconds: number;
}
export interface SpreadSnapshotDto {
    subscription: SpreadSubscriptionDto;
    status: SpreadStatus;
    accountAQuote: SpreadQuoteDto | null;
    accountBQuote: SpreadQuoteDto | null;
    longSpread: number | null;
    shortSpread: number | null;
    stability: SpreadStabilityDto;
}
export interface SpreadPanelDto {
    accountGroupId: number;
    accountGroupName: string;
    accountA: {
        id: number;
        login: number;
        label: string | null;
        sessionId: string | null;
    };
    accountB: {
        id: number;
        login: number;
        label: string | null;
        sessionId: string | null;
    };
    subscriptions: SpreadSnapshotDto[];
}
export interface SpreadChartCandleDto {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}
export interface SpreadChartSeriesDto {
    title: string;
    symbol: string;
    candles: SpreadChartCandleDto[];
}
export interface SpreadChartDto {
    subscriptionId: number;
    accountGroupId: number;
    timeframeMinutes: SpreadChartTimeframeMinutes;
    accountA: SpreadChartSeriesDto;
    accountB: SpreadChartSeriesDto;
    spread: SpreadChartSeriesDto;
}
export interface PlaceSpreadOrderInput {
    subscriptionId: number;
    direction: SpreadTradeDirection;
    lotsA: number;
    lotsB?: number;
    comment?: string;
    orderGroupName?: string;
    remark?: string;
    slA?: number;
    tpA?: number;
    slB?: number;
    tpB?: number;
}
export declare class SpreadService extends EventEmitter {
    private readonly repo;
    private readonly accountGroupRepo;
    private readonly wsManager;
    private readonly mt5Sdk;
    private readonly pushService;
    private readonly orderGroupService;
    private readonly runtimeById;
    private readonly quoteStore;
    private readonly subscriptionIndex;
    private readonly runtimeStateById;
    private readonly lastNotificationAt;
    private heartbeatTimer;
    constructor(repo: ISpreadSubscriptionRepository, accountGroupRepo: IAccountGroupRepository, wsManager: WsConnectionManager, mt5Sdk: Mt5ApiSdk, pushService: PushService, orderGroupService: OrderGroupService);
    initialize(): Promise<void>;
    listByAccountGroup(accountGroupId: number): Promise<SpreadSubscriptionDto[]>;
    create(accountGroupId: number, input: CreateSpreadSubscriptionInput): Promise<SpreadSubscriptionDto>;
    update(accountGroupId: number, subscriptionId: number, input: UpdateSpreadSubscriptionInput): Promise<SpreadSubscriptionDto>;
    delete(accountGroupId: number, subscriptionId: number): Promise<void>;
    getPanel(accountGroupId: number): Promise<SpreadPanelDto>;
    getSnapshot(subscriptionId: number): SpreadSnapshotDto | null;
    getRuntimeSubscriptionIds(): number[];
    getChart(accountGroupId: number, subscriptionId: number, timeframeMinutes: SpreadChartTimeframeMinutes, limit?: number): Promise<SpreadChartDto>;
    placeOrder(accountGroupId: number, input: PlaceSpreadOrderInput): Promise<OrderGroupDto>;
    handleAccountConnected(accountId: number, sessionId: string): Promise<void>;
    handleAccountDisconnected(accountId: number): void;
    handleQuote(quote: DownstreamQuote): Promise<void>;
    close(): void;
    private ensureHeartbeatLoop;
    private getSnapshotFromRow;
    private toSpreadQuote;
    private maybeNotify;
    private sendNotification;
    private installRuntime;
    private removeRuntime;
    private syncRuntime;
    private updateRuntimeFingerprint;
    private getRuntimeState;
    private attachQuoteHeartbeats;
    private addIndex;
    private removeIndex;
    private ensureUnderlyingSubscriptions;
    private ensureAccountGroup;
    private ensureAccountGroupExists;
    private toSpreadSubscriptionDto;
    private emitConfigSnapshot;
}
//# sourceMappingURL=spread.service.d.ts.map