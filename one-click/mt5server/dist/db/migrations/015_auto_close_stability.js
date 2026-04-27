import { sql } from 'kysely';
async function addColumnIfMissing(db, columnNames, name, add) {
    if (columnNames.has(name))
        return;
    await add();
}
export async function up(db) {
    const columns = await sql `PRAGMA table_info(spread_subscriptions)`.execute(db);
    const columnNames = new Set(columns.rows.map((row) => row.name));
    await addColumnIfMissing(db, columnNames, 'auto_close_stability_seconds', async () => {
        await db.schema.alterTable('spread_subscriptions')
            .addColumn('auto_close_stability_seconds', 'integer', (col) => col.notNull().defaultTo(0))
            .execute();
    });
}
export async function down(_db) {
    // SQLite 回滚列成本较高，保留前进式迁移。
}
//# sourceMappingURL=015_auto_close_stability.js.map