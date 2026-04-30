import { EventEmitter } from 'node:events';
import type { IAutoTradeLogRepository } from '../db/repositories/auto-trade-log.repository.js';
import type { ISpreadSubscriptionRepository } from '../db/repositories/spread-subscription.repository.js';
import type { IAccountGroupRepository } from '../db/repositories/account-group.repository.js';
import type { AutoTradeLogLevel, AutoTradeLogPhase } from '../db/kysely/database.js';
import type { DownstreamQuote, WsConnectionManager } from './ws-manager.js';
import type { PushService } from './push/index.js';
import type { OrderGroupService, OrderGroupDto } from './order-group.service.js';
import type { Mt5ApiSdk } from '../integrations/mt5/sdk/index.js';
export type SpreadTradeDirection = 'sellA_buyB' | 'sellB_buyA';
export type SpreadStatus = 'ready' | 'waiting_quote' | 'disabled';
export type SpreadChartTimeframeMinutes = 1 | 5 | 15;
export type AutoTradeDirection = 'expand' | 'shrink';
export interface AutoTradeConfigDto {
    enabled: boolean;
    autoOpenExpandEnabled: boolean;
    autoOpenShrinkEnabled: boolean;
    targetExpandGroups: number;
    targetShrinkGroups: number;
    autoOpenExpandThreshold: number | null;
    autoOpenShrinkThreshold: number | null;
    autoOpenStabilitySeconds: number;
    autoOpenCooldownSeconds: number;
    autoCloseEnabled: boolean;
    autoCloseExpandEnabled: boolean;
    autoCloseShrinkEnabled: boolean;
    autoCloseExpandProtection: number | null;
    autoCloseShrinkProtection: number | null;
    autoCloseStabilitySeconds: number;
    autoCloseBatchCount: number;
    autoCloseCooldownSeconds: number;
    singleLegDetectEnabled: boolean;
    singleLegTimeoutSeconds: number;
    singleLegPriceDriftThreshold: number | null;
    autoCloseSingleLegEnabled: boolean;
    autoCloseSingleLegCooldownSeconds: number;
    autoCloseSingleLegMaxRetries: number;
    singleLegNotifyEnabled: boolean;
    singleLegNotifyChannelIds: number[];
    singleLegNotifyLevels: AutoTradeLogLevel[];
}
export interface AutoTradeLogDto {
    id: number;
    accountGroupId: number;
    subscriptionId: number;
    phase: AutoTradeLogPhase;
    action: string;
    direction: AutoTradeDirection | null;
    level: AutoTradeLogLevel;
    reason: string | null;
    runtimeState: string | null;
    longSpread: number | null;
    shortSpread: number | null;
    longStableSeconds: number | null;
    shortStableSeconds: number | null;
    requestId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}
export interface AutoTradeLogListInput {
    accountGroupId?: number;
    subscriptionId?: number;
    phase?: AutoTradeLogPhase;
    level?: AutoTradeLogLevel;
    direction?: AutoTradeDirection;
    action?: string;
    page?: number;
    pageSize?: number;
}
export interface AutoTradeLogListDto {
    items: AutoTradeLogDto[];
    total: number;
    page: number;
    pageSize: number;
}
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
    autoTrade: AutoTradeConfigDto;
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
    autoTradeEnabled?: boolean;
    autoOpenExpandEnabled?: boolean;
    autoOpenShrinkEnabled?: boolean;
    targetExpandGroups?: number;
    targetShrinkGroups?: number;
    autoOpenExpandThreshold?: number | null;
    autoOpenShrinkThreshold?: number | null;
    autoOpenStabilitySeconds?: number;
    autoOpenCooldownSeconds?: number;
    autoCloseEnabled?: boolean;
    autoCloseExpandEnabled?: boolean;
    autoCloseShrinkEnabled?: boolean;
    autoCloseExpandProtection?: number | null;
    autoCloseShrinkProtection?: number | null;
    autoCloseStabilitySeconds?: number;
    autoCloseBatchCount?: number;
    autoCloseCooldownSeconds?: number;
    singleLegDetectEnabled?: boolean;
    singleLegTimeoutSeconds?: number;
    singleLegPriceDriftThreshold?: number | null;
    autoCloseSingleLegEnabled?: boolean;
    autoCloseSingleLegCooldownSeconds?: number;
    autoCloseSingleLegMaxRetries?: number;
    singleLegNotifyEnabled?: boolean;
    singleLegNotifyChannelIds?: number[];
    singleLegNotifyLevels?: AutoTradeLogLevel[];
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
    autoTradeEnabled?: boolean;
    autoOpenExpandEnabled?: boolean;
    autoOpenShrinkEnabled?: boolean;
    targetExpandGroups?: number;
    targetShrinkGroups?: number;
    autoOpenExpandThreshold?: number | null;
    autoOpenShrinkThreshold?: number | null;
    autoOpenStabilitySeconds?: number;
    autoOpenCooldownSeconds?: number;
    autoCloseEnabled?: boolean;
    autoCloseExpandEnabled?: boolean;
    autoCloseShrinkEnabled?: boolean;
    autoCloseExpandProtection?: number | null;
    autoCloseShrinkProtection?: number | null;
    autoCloseStabilitySeconds?: number;
    autoCloseBatchCount?: number;
    autoCloseCooldownSeconds?: number;
    singleLegDetectEnabled?: boolean;
    singleLegTimeoutSeconds?: number;
    singleLegPriceDriftThreshold?: number | null;
    autoCloseSingleLegEnabled?: boolean;
    autoCloseSingleLegCooldownSeconds?: number;
    autoCloseSingleLegMaxRetries?: number;
    singleLegNotifyEnabled?: boolean;
    singleLegNotifyChannelIds?: number[];
    singleLegNotifyLevels?: AutoTradeLogLevel[];
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
export interface SpreadLinePointDto {
    time: string;
    value: number;
}
export interface SpreadSecondLineSeedDto {
    subscriptionId: number;
    accountGroupId: number;
    seconds: number;
    accountA: SpreadLinePointDto[];
    accountB: SpreadLinePointDto[];
    expandSpread: SpreadLinePointDto[];
    shrinkSpread: SpreadLinePointDto[];
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
type AutoTradeRuntimeStatus = 'idle' | 'opening' | 'open_cooldown' | 'closing' | 'close_cooldown';
export interface AutoTradeSideRuntimeDto {
    status: AutoTradeRuntimeStatus;
    opening: boolean;
    closing: boolean;
    cooldownRemainingSeconds: number;
    lastActionAt: string | null;
    lastOpenAt: string | null;
    lastCloseAt: string | null;
    lastReason: string | null;
    lastError: string | null;
    currentGroupCount: number;
    targetGroupCount: number;
}
export interface AutoTradeRuntimeDto {
    subscriptionId: number;
    accountGroupId: number;
    enabled: boolean;
    locked: boolean;
    expand: AutoTradeSideRuntimeDto;
    shrink: AutoTradeSideRuntimeDto;
}
export declare class SpreadService extends EventEmitter {
    private readonly repo;
    private readonly autoTradeLogRepo;
    private readonly accountGroupRepo;
    private readonly wsManager;
    private readonly mt5Sdk;
    private readonly pushService;
    private readonly orderGroupService;
    private readonly runtimeById;
    private readonly quoteStore;
    private readonly subscriptionIndex;
    private readonly runtimeStateById;
    private readonly autoTradeRuntimeById;
    private readonly singleLegRuntimeByGroupId;
    private readonly secondPointStore;
    private readonly lastNotificationAt;
    private readonly lastAutoTradeDecisionAt;
    private heartbeatTimer;
    constructor(repo: ISpreadSubscriptionRepository, autoTradeLogRepo: IAutoTradeLogRepository, accountGroupRepo: IAccountGroupRepository, wsManager: WsConnectionManager, mt5Sdk: Mt5ApiSdk, pushService: PushService, orderGroupService: OrderGroupService);
    initialize(): Promise<void>;
    listByAccountGroup(accountGroupId: number): Promise<SpreadSubscriptionDto[]>;
    create(accountGroupId: number, input: CreateSpreadSubscriptionInput): Promise<SpreadSubscriptionDto>;
    update(accountGroupId: number, subscriptionId: number, input: UpdateSpreadSubscriptionInput): Promise<SpreadSubscriptionDto>;
    listAutoTradeLogs(input: AutoTradeLogListInput): Promise<AutoTradeLogListDto>;
    writeAutoTradeLog(input: {
        accountGroupId: number;
        subscriptionId: number;
        phase: AutoTradeLogPhase;
        action: string;
        direction?: AutoTradeDirection | null;
        level?: AutoTradeLogLevel;
        reason?: string | null;
        runtimeState?: string | null;
        longSpread?: number | null;
        shortSpread?: number | null;
        longStableSeconds?: number | null;
        shortStableSeconds?: number | null;
        requestId?: string | null;
        metadata?: Record<string, unknown> | null;
    }): Promise<AutoTradeLogDto>;
    delete(accountGroupId: number, subscriptionId: number): Promise<void>;
    getPanel(accountGroupId: number): Promise<SpreadPanelDto>;
    getSnapshot(subscriptionId: number): SpreadSnapshotDto | null;
    getRuntimeSubscriptionIds(): number[];
    getAutoTradeRuntime(subscriptionId: number): Promise<AutoTradeRuntimeDto>;
    listAutoTradeRuntime(accountGroupId?: number, subscriptionId?: number): Promise<AutoTradeRuntimeDto[]>;
    getChart(accountGroupId: number, subscriptionId: number, timeframeMinutes: SpreadChartTimeframeMinutes, limit?: number): Promise<SpreadChartDto>;
    getSecondLineSeed(accountGroupId: number, subscriptionId: number, seconds?: number): Promise<SpreadSecondLineSeedDto>;
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
    private recordSecondLinePoint;
    private getAutoTradeRuntimeState;
    private buildAutoTradeRuntimeDto;
    private maybeRunAutoTrade;
    private handleSingleLegRisk;
    private getLatestRuntimeGroup;
    private tryAutoOpen;
    private tryAutoClose;
    private maybeLogAutoTradeDecision;
    private findOpenGroupsForSubscription;
    private findSingleLegCandidateForSubscription;
    private filterOpenGroupsForSubscription;
    private getSingleLegRuntimeState;
    private resetAutoTradePause;
    private maybeNotifySingleLeg;
    private maybeNotifyAutoTradeExecution;
}
export {};
//# sourceMappingURL=spread.service.d.ts.map