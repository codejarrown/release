import { sql } from 'kysely';
export async function up(db) {
    const columns = await sql `PRAGMA table_info(spread_subscriptions)`.execute(db);
    const columnNames = new Set(columns.rows.map((row) => row.name));
    if (!columnNames.has('notify_expand_threshold')) {
        await db.schema
            .alterTable('spread_subscriptions')
            .addColumn('notify_expand_threshold', 'real')
            .execute();
    }
    if (!columnNames.has('notify_contract_threshold')) {
        await db.schema
            .alterTable('spread_subscriptions')
            .addColumn('notify_contract_threshold', 'real')
            .execute();
    }
    if (!columnNames.has('notify_stability_seconds')) {
        await db.schema
            .alterTable('spread_subscriptions')
            .addColumn('notify_stability_seconds', 'integer', (col) => col.notNull().defaultTo(3))
            .execute();
    }
    if (columnNames.has('notify_spread_a_over_b')) {
        await sql `
      UPDATE spread_subscriptions
      SET notify_expand_threshold = COALESCE(notify_expand_threshold, notify_spread_a_over_b)
    `.execute(db);
    }
    if (columnNames.has('notify_spread_b_over_a')) {
        await sql `
      UPDATE spread_subscriptions
      SET notify_contract_threshold = COALESCE(notify_contract_threshold, notify_spread_b_over_a)
    `.execute(db);
    }
    await sql `
    UPDATE spread_subscriptions
    SET notify_stability_seconds = COALESCE(notify_stability_seconds, 3)
  `.execute(db);
}
export async function down(_db) {
    // SQLite 对 drop column / rename column 的兼容处理较重，此处不做回滚。
}
//# sourceMappingURL=009_spread_subscription_thresholds.js.map