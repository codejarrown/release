import { EventEmitter } from 'node:events';
import type { IOrderGroupRepository, OrderGroupListFilter, OrderGroupSummaryFilter } from '../db/repositories/order-group.repository.js';
import type { IAccountGroupRepository } from '../db/repositories/account-group.repository.js';
import type { IMt5AccountRepository } from '../db/repositories/mt5-account.repository.js';
import type { Mt5ApiSdk } from '../integrations/mt5/sdk/index.js';
import type { PushService } from './push/index.js';
import type { SpreadService } from './spread.service.js';
export interface OrderGroupItemDto {
    id: number;
    accountId: number;
    accountLogin: number;
    accountLabel: string | null;
    ticket: number | null;
    symbol: string;
    orderType: string;
    lots: number;
    openPrice: number | null;
    closePrice: number | null;
    profit: number | null;
    sl: number | null;
    tp: number | null;
    status: string;
    errorMessage: string | null;
    openedAt: string | null;
    closedAt: string | null;
}
export interface OrderGroupDto {
    id: number;
    name: string;
    accountGroupId: number | null;
    accountGroupName: string | null;
    isFullyClosed: boolean;
    remark: string | null;
    totalProfit: number;
    openCount: number;
    closedCount: number;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
    items: OrderGroupItemDto[];
}
export interface CreateOrderGroupInput {
    name: string;
    accountGroupId?: number;
    remark?: string;
}
export interface UpdateOrderGroupInput {
    name?: string;
    accountGroupId?: number | null;
    remark?: string;
}
export interface BatchOrderInput {
    accountId: number;
    symbol: string;
    type: number;
    lots: number;
    price?: number;
    sl?: number;
    tp?: number;
    comment?: string;
}
export interface BatchCreateInput {
    name: string;
    accountGroupId?: number;
    remark?: string;
    orders: BatchOrderInput[];
}
export interface OrderGroupListResult {
    data: OrderGroupDto[];
    total: number;
    page: number;
    pageSize: number;
}
export interface OrderGroupSummaryDto {
    groupCount: number;
    orderCount: number;
    openOrderCount: number;
    totalProfit: number;
    createdDateFrom: string | null;
    createdDateTo: string | null;
}
export interface OrderGroupRemoveEvent {
    groupId: number;
    accountGroupId: number | null;
}
export interface BatchCloseOptions {
    reverseOpen?: boolean;
}
export declare class OrderGroupService extends EventEmitter {
    private readonly orderGroupRepo;
    private readonly accountGroupRepo;
    private readonly accountRepo;
    private readonly mt5Sdk;
    private readonly pushService;
    private spreadService;
    constructor(orderGroupRepo: IOrderGroupRepository, accountGroupRepo: IAccountGroupRepository, accountRepo: IMt5AccountRepository, mt5Sdk: Mt5ApiSdk, pushService: PushService);
    setSpreadService(spreadService: Pick<SpreadService, 'placeOrder'>): void;
    list(filter: OrderGroupListFilter & {
        page?: number;
        pageSize?: number;
    }): Promise<OrderGroupListResult>;
    summary(filter: OrderGroupSummaryFilter): Promise<OrderGroupSummaryDto>;
    getById(id: number): Promise<OrderGroupDto>;
    listOpenRuntimeGroups(): Promise<OrderGroupDto[]>;
    create(input: CreateOrderGroupInput): Promise<OrderGroupDto>;
    update(id: number, input: UpdateOrderGroupInput): Promise<OrderGroupDto>;
    delete(id: number, force?: boolean): Promise<void>;
    batchOpen(groupId: number, orders: BatchOrderInput[]): Promise<OrderGroupDto>;
    batchCreate(input: BatchCreateInput): Promise<OrderGroupDto>;
    batchClose(groupId: number, tickets?: number[], options?: BatchCloseOptions): Promise<OrderGroupDto>;
    batchCloseMany(groupIds: number[], options?: BatchCloseOptions): Promise<OrderGroupDto[]>;
    private createGroupDto;
    private executeSingleOrder;
    private buildReverseSpreadOrderPayload;
    private executeSingleClose;
    private toDto;
    private publishGroupState;
}
//# sourceMappingURL=order-group.service.d.ts.map