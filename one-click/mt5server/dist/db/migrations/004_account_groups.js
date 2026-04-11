import { sql } from 'kysely';
export async function up(db) {
    await db.schema
        .createTable('account_groups')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('account_a_id', 'integer', (col) => col.notNull())
        .addColumn('account_b_id', 'integer', (col) => col.notNull())
        .addColumn('is_enabled', 'integer', (col) => col.notNull().defaultTo(1))
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .execute();
    await db.schema
        .createIndex('idx_account_groups_a')
        .on('account_groups')
        .columns(['account_a_id'])
        .execute();
    await db.schema
        .createIndex('idx_account_groups_b')
        .on('account_groups')
        .columns(['account_b_id'])
        .execute();
}
export async function down(db) {
    await db.schema.dropTable('account_groups').ifExists().execute();
}
//# sourceMappingURL=004_account_groups.js.map