import { sql } from 'kysely';
export async function up(db) {
    await db.schema
        .createTable('spread_subscriptions')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('account_group_id', 'integer', (col) => col.notNull().references('account_groups.id').onDelete('cascade'))
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('symbol_a', 'text', (col) => col.notNull())
        .addColumn('symbol_b', 'text', (col) => col.notNull())
        .addColumn('is_enabled', 'integer', (col) => col.notNull().defaultTo(1))
        .addColumn('notify_enabled', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('notify_channel_ids', 'text')
        .addColumn('notify_expand_threshold', 'real')
        .addColumn('notify_contract_threshold', 'real')
        .addColumn('notify_stability_seconds', 'integer', (col) => col.notNull().defaultTo(3))
        .addColumn('cooldown_seconds', 'integer', (col) => col.notNull().defaultTo(60))
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .execute();
}
export async function down(db) {
    await db.schema.dropTable('spread_subscriptions').execute();
}
//# sourceMappingURL=008_spread_subscriptions.js.map