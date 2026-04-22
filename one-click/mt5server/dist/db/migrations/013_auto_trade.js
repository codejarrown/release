import { sql } from 'kysely';
async function addColumnIfMissing(db, columnNames, name, add) {
    if (columnNames.has(name))
        return;
    await add();
}
export async function up(db) {
    const columns = await sql `PRAGMA table_info(spread_subscriptions)`.execute(db);
    const columnNames = new Set(columns.rows.map((row) => row.name));
    await addColumnIfMissing(db, columnNames, 'auto_trade_enabled', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_trade_enabled', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_open_expand_enabled', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_open_expand_enabled', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_open_shrink_enabled', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_open_shrink_enabled', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'target_expand_groups', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('target_expand_groups', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'target_shrink_groups', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('target_shrink_groups', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_open_expand_threshold', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_open_expand_threshold', 'real')
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_open_shrink_threshold', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_open_shrink_threshold', 'real')
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_open_stability_seconds', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_open_stability_seconds', 'integer', (col) => col.notNull().defaultTo(3))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_open_cooldown_seconds', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_open_cooldown_seconds', 'integer', (col) => col.notNull().defaultTo(15))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_enabled', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_enabled', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_expand_enabled', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_expand_enabled', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_shrink_enabled', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_shrink_enabled', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_expand_protection', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_expand_protection', 'real')
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_shrink_protection', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_shrink_protection', 'real')
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_batch_count', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_batch_count', 'integer', (col) => col.notNull().defaultTo(1))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_cooldown_seconds', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_cooldown_seconds', 'integer', (col) => col.notNull().defaultTo(5))
            .execute();
    });
    await sql `
    UPDATE spread_subscriptions
    SET auto_open_expand_threshold = COALESCE(auto_open_expand_threshold, notify_expand_threshold),
        auto_open_shrink_threshold = COALESCE(auto_open_shrink_threshold, notify_contract_threshold),
        auto_open_stability_seconds = COALESCE(auto_open_stability_seconds, notify_stability_seconds, 3)
  `.execute(db);
    await db.schema
        .createTable('auto_trade_logs')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('account_group_id', 'integer', (col) => col.notNull().references('account_groups.id').onDelete('cascade'))
        .addColumn('subscription_id', 'integer', (col) => col.notNull().references('spread_subscriptions.id').onDelete('cascade'))
        .addColumn('phase', 'text', (col) => col.notNull())
        .addColumn('action', 'text', (col) => col.notNull())
        .addColumn('direction', 'text')
        .addColumn('level', 'text', (col) => col.notNull().defaultTo('info'))
        .addColumn('reason', 'text')
        .addColumn('runtime_state', 'text')
        .addColumn('long_spread', 'real')
        .addColumn('short_spread', 'real')
        .addColumn('long_stable_seconds', 'real')
        .addColumn('short_stable_seconds', 'real')
        .addColumn('request_id', 'text')
        .addColumn('metadata', 'text')
        .addColumn('created_at', 'text', (col) => col.notNull())
        .execute();
    await db.schema
        .createIndex('auto_trade_logs_subscription_created_at_idx')
        .ifNotExists()
        .on('auto_trade_logs')
        .columns(['subscription_id', 'created_at'])
        .execute();
    await db.schema
        .createIndex('auto_trade_logs_account_group_created_at_idx')
        .ifNotExists()
        .on('auto_trade_logs')
        .columns(['account_group_id', 'created_at'])
        .execute();
}
export async function down(_db) {
    // SQLite 回滚列成本较高，保留前进式迁移。
}
//# sourceMappingURL=013_auto_trade.js.map