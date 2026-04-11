import { type Kysely } from 'kysely';
import type { Database, OrderGroup, NewOrderGroup, OrderGroupUpdate, OrderGroupItem, NewOrderGroupItem, OrderGroupItemUpdate } from '../kysely/database.js';
export interface OrderGroupWithItems extends OrderGroup {
    items: OrderGroupItemWithAccount[];
}
export interface OrderGroupItemWithAccount extends OrderGroupItem {
    account_login: number;
    account_label: string | null;
}
export interface IOrderGroupRepository {
    findById(id: number): Promise<OrderGroup | undefined>;
    findAll(filter?: OrderGroupListFilter): Promise<OrderGroup[]>;
    countAll(filter?: OrderGroupListFilter): Promise<number>;
    summarize(filter?: OrderGroupSummaryFilter): Promise<OrderGroupSummary>;
    create(group: NewOrderGroup): Promise<OrderGroup>;
    update(id: number, data: OrderGroupUpdate): Promise<OrderGroup | undefined>;
    deleteById(id: number): Promise<boolean>;
    findByIdWithItems(id: number): Promise<OrderGroupWithItems | undefined>;
    findAllWithItems(filter?: OrderGroupListFilter): Promise<OrderGroupWithItems[]>;
    addItem(item: NewOrderGroupItem): Promise<OrderGroupItem>;
    addItems(items: NewOrderGroupItem[]): Promise<OrderGroupItem[]>;
    updateItem(id: number, data: OrderGroupItemUpdate): Promise<OrderGroupItem | undefined>;
    findItemsByGroupId(groupId: number): Promise<OrderGroupItemWithAccount[]>;
    findOpenItemsByGroupId(groupId: number): Promise<OrderGroupItemWithAccount[]>;
    hasOpenItems(groupId: number): Promise<boolean>;
    refreshFullyClosedStatus(groupId: number): Promise<void>;
}
export interface OrderGroupListFilter {
    accountGroupId?: number;
    isFullyClosed?: boolean;
    createdDateFrom?: string;
    createdDateTo?: string;
    page?: number;
    pageSize?: number;
}
export interface OrderGroupSummaryFilter {
    accountGroupId?: number;
    isFullyClosed?: boolean;
    createdDateFrom?: string;
    createdDateTo?: string;
}
export interface OrderGroupSummary {
    groupCount: number;
    orderCount: number;
    openOrderCount: number;
    totalProfit: number;
}
export declare class OrderGroupRepository implements IOrderGroupRepository {
    private readonly db;
    constructor(db: Kysely<Database>);
    findById(id: number): Promise<OrderGroup | undefined>;
    findAll(filter?: OrderGroupListFilter): Promise<OrderGroup[]>;
    countAll(filter?: OrderGroupListFilter): Promise<number>;
    summarize(filter?: OrderGroupSummaryFilter): Promise<OrderGroupSummary>;
    create(group: NewOrderGroup): Promise<OrderGroup>;
    update(id: number, data: OrderGroupUpdate): Promise<OrderGroup | undefined>;
    deleteById(id: number): Promise<boolean>;
    findByIdWithItems(id: number): Promise<OrderGroupWithItems | undefined>;
    findAllWithItems(filter?: OrderGroupListFilter): Promise<OrderGroupWithItems[]>;
    findItemsByGroupId(groupId: number): Promise<OrderGroupItemWithAccount[]>;
    findOpenItemsByGroupId(groupId: number): Promise<OrderGroupItemWithAccount[]>;
    addItem(item: NewOrderGroupItem): Promise<OrderGroupItem>;
    addItems(items: NewOrderGroupItem[]): Promise<OrderGroupItem[]>;
    updateItem(id: number, data: OrderGroupItemUpdate): Promise<OrderGroupItem | undefined>;
    hasOpenItems(groupId: number): Promise<boolean>;
    refreshFullyClosedStatus(groupId: number): Promise<void>;
}
//# sourceMappingURL=order-group.repository.d.ts.map