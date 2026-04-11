import { sql } from 'kysely';
export async function up(db) {
    const columns = await sql `PRAGMA table_info(spread_subscriptions)`.execute(db);
    const columnNames = new Set(columns.rows.map((row) => row.name));
    if (!columnNames.has('lots_a')) {
        await db.schema
            .alterTable('spread_subscriptions')
            .addColumn('lots_a', 'real', (col) => col.notNull().defaultTo(1))
            .execute();
    }
    if (!columnNames.has('lots_b')) {
        await db.schema
            .alterTable('spread_subscriptions')
            .addColumn('lots_b', 'real')
            .execute();
    }
    await sql `
    UPDATE spread_subscriptions
    SET lots_a = COALESCE(lots_a, 1)
  `.execute(db);
}
export async function down(_db) {
    // SQLite 对 drop column 的兼容处理较重，此处不做回滚。
}
//# sourceMappingURL=010_spread_subscription_lots.js.map