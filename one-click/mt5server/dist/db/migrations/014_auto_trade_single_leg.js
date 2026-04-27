import { sql } from 'kysely';
async function addColumnIfMissing(db, columnNames, name, add) {
    if (columnNames.has(name))
        return;
    await add();
}
export async function up(db) {
    const columns = await sql `PRAGMA table_info(spread_subscriptions)`.execute(db);
    const columnNames = new Set(columns.rows.map((row) => row.name));
    await addColumnIfMissing(db, columnNames, 'single_leg_detect_enabled', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('single_leg_detect_enabled', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'single_leg_timeout_seconds', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('single_leg_timeout_seconds', 'integer', (col) => col.notNull().defaultTo(5))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'single_leg_price_drift_threshold', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('single_leg_price_drift_threshold', 'real')
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_single_leg_enabled', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_single_leg_enabled', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_single_leg_cooldown_seconds', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_single_leg_cooldown_seconds', 'integer', (col) => col.notNull().defaultTo(5))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'auto_close_single_leg_max_retries', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_single_leg_max_retries', 'integer', (col) => col.notNull().defaultTo(1))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'single_leg_notify_enabled', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('single_leg_notify_enabled', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'single_leg_notify_channel_ids', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('single_leg_notify_channel_ids', 'text')
            .execute();
    });
    await addColumnIfMissing(db, columnNames, 'single_leg_notify_levels', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('single_leg_notify_levels', 'text')
            .execute();
    });
}
export async function down(_db) {
    // SQLite 回滚列成本较高，保留前进式迁移。
}
//# sourceMappingURL=014_auto_trade_single_leg.js.map