import type { Generated, Insertable, Selectable, Updateable } from 'kysely';
export interface Database {
    mt5_accounts: Mt5AccountTable;
    sync_jobs: SyncJobTable;
    push_channels: PushChannelTable;
    account_groups: AccountGroupTable;
    spread_subscriptions: SpreadSubscriptionTable;
    order_groups: OrderGroupTable;
    order_group_items: OrderGroupItemTable;
}
export type ConnectionType = 'address' | 'server';
export interface Mt5AccountTable {
    id: Generated<number>;
    login: number;
    connection_type: ConnectionType;
    password_encrypted: string;
    host: string | null;
    port: number | null;
    server_name: string | null;
    timeout_ms: Generated<number>;
    label: string | null;
    is_enabled: Generated<number>;
    auto_reconnect_enabled: Generated<number>;
    reconnect_delay_ms: Generated<number>;
    max_reconnect_attempts: Generated<number>;
    session_id: string | null;
    last_connected_at: string | null;
    last_error: string | null;
    default_subscriptions: string | null;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}
export type Mt5Account = Selectable<Mt5AccountTable>;
export type NewMt5Account = Insertable<Mt5AccountTable>;
export type Mt5AccountUpdate = Updateable<Mt5AccountTable>;
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';
export interface SyncJobTable {
    id: Generated<number>;
    job_type: string;
    status: SyncJobStatus;
    account_login: number | null;
    error_message: string | null;
    retry_count: Generated<number>;
    started_at: string | null;
    completed_at: string | null;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}
export type SyncJob = Selectable<SyncJobTable>;
export type NewSyncJob = Insertable<SyncJobTable>;
export type SyncJobUpdate = Updateable<SyncJobTable>;
export type PushPlatform = 'telegram' | 'dingtalk' | 'feishu' | 'webhook';
export interface PushChannelTable {
    id: Generated<number>;
    name: string;
    platform: PushPlatform;
    config_encrypted: string;
    is_enabled: Generated<number>;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}
export type PushChannel = Selectable<PushChannelTable>;
export type NewPushChannel = Insertable<PushChannelTable>;
export type PushChannelUpdate = Updateable<PushChannelTable>;
export interface AccountGroupTable {
    id: Generated<number>;
    name: string;
    account_a_id: number;
    account_b_id: number;
    is_enabled: Generated<number>;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}
export type AccountGroup = Selectable<AccountGroupTable>;
export type NewAccountGroup = Insertable<AccountGroupTable>;
export type AccountGroupUpdate = Updateable<AccountGroupTable>;
export interface SpreadSubscriptionTable {
    id: Generated<number>;
    account_group_id: number;
    name: string;
    symbol_a: string;
    symbol_b: string;
    lots_a: Generated<number>;
    lots_b: number | null;
    is_enabled: Generated<number>;
    notify_enabled: Generated<number>;
    notify_channel_ids: string | null;
    notify_expand_threshold: number | null;
    notify_contract_threshold: number | null;
    notify_stability_seconds: Generated<number>;
    cooldown_seconds: Generated<number>;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}
export type SpreadSubscription = Selectable<SpreadSubscriptionTable>;
export type NewSpreadSubscription = Insertable<SpreadSubscriptionTable>;
export type SpreadSubscriptionUpdate = Updateable<SpreadSubscriptionTable>;
export type OrderGroupItemStatus = 'pending' | 'open' | 'closed' | 'failed';
export interface OrderGroupTable {
    id: Generated<number>;
    name: string;
    account_group_id: number | null;
    is_fully_closed: Generated<number>;
    remark: string | null;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}
export type OrderGroup = Selectable<OrderGroupTable>;
export type NewOrderGroup = Insertable<OrderGroupTable>;
export type OrderGroupUpdate = Updateable<OrderGroupTable>;
export interface OrderGroupItemTable {
    id: Generated<number>;
    order_group_id: number;
    account_id: number;
    ticket: number | null;
    symbol: string;
    order_type: string;
    lots: number;
    open_price: number | null;
    close_price: number | null;
    profit: number | null;
    sl: number | null;
    tp: number | null;
    status: Generated<string>;
    error_message: string | null;
    opened_at: string | null;
    closed_at: string | null;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}
export type OrderGroupItem = Selectable<OrderGroupItemTable>;
export type NewOrderGroupItem = Insertable<OrderGroupItemTable>;
export type OrderGroupItemUpdate = Updateable<OrderGroupItemTable>;
//# sourceMappingURL=database.d.ts.map