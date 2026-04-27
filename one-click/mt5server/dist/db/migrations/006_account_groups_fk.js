import { sql } from 'kysely';
export async function up(db) {
    const mdb = db;
    // SQLite: recreate table with foreign key constraints
    await mdb.schema
        .createTable('account_groups_new')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('account_a_id', 'integer', (col) => col
        .notNull()
        .references('mt5_accounts.id')
        .onDelete('restrict'))
        .addColumn('account_b_id', 'integer', (col) => col
        .notNull()
        .references('mt5_accounts.id')
        .onDelete('restrict'))
        .addColumn('is_enabled', 'integer', (col) => col.notNull().defaultTo(1))
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .execute();
    // Copy existing data
    await mdb
        .insertInto('account_groups_new')
        .columns(['id', 'name', 'account_a_id', 'account_b_id', 'is_enabled', 'created_at', 'updated_at'])
        .expression(mdb
        .selectFrom('account_groups')
        .select(['id', 'name', 'account_a_id', 'account_b_id', 'is_enabled', 'created_at', 'updated_at']))
        .execute();
    // Drop old indexes and table, then rename new table
    await mdb.schema.dropTable('account_groups').execute();
    await mdb.schema.alterTable('account_groups_new').renameTo('account_groups').execute();
    // Recreate indexes
    await mdb.schema
        .createIndex('idx_account_groups_a')
        .on('account_groups')
        .columns(['account_a_id'])
        .execute();
    await mdb.schema
        .createIndex('idx_account_groups_b')
        .on('account_groups')
        .columns(['account_b_id'])
        .execute();
}
export async function down(db) {
    const mdb = db;
    // Best-effort revert: drop FKs by recreating table without constraints
    await mdb.schema
        .createTable('account_groups_old')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('account_a_id', 'integer', (col) => col.notNull())
        .addColumn('account_b_id', 'integer', (col) => col.notNull())
        .addColumn('is_enabled', 'integer', (col) => col.notNull().defaultTo(1))
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .execute();
    await mdb
        .insertInto('account_groups_old')
        .columns(['id', 'name', 'account_a_id', 'account_b_id', 'is_enabled', 'created_at', 'updated_at'])
        .expression(mdb
        .selectFrom('account_groups')
        .select(['id', 'name', 'account_a_id', 'account_b_id', 'is_enabled', 'created_at', 'updated_at']))
        .execute();
    await mdb.schema.dropTable('account_groups').execute();
    await mdb.schema.alterTable('account_groups_old').renameTo('account_groups').execute();
    await mdb.schema
        .createIndex('idx_account_groups_a')
        .on('account_groups')
        .columns(['account_a_id'])
        .execute();
    await mdb.schema
        .createIndex('idx_account_groups_b')
        .on('account_groups')
        .columns(['account_b_id'])
        .execute();
}
//# sourceMappingURL=006_account_groups_fk.js.map