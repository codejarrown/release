import { sql } from 'kysely';
export async function up(db) {
    const columns = await sql `PRAGMA table_info(order_groups)`.execute(db);
    const columnNames = new Set(columns.rows.map((row) => row.name));
    if (!columnNames.has('open_spread')) {
        await db.schema
            .alterTable('order_groups')
            .addColumn('open_spread', 'real')
            .execute();
    }
    if (!columnNames.has('close_spread')) {
        await db.schema
            .alterTable('order_groups')
            .addColumn('close_spread', 'real')
            .execute();
    }
}
export async function down(_db) {
    // SQLite 对 drop column 的兼容处理较重，此处不做回滚。
}
//# sourceMappingURL=012_order_group_spreads.js.map