import { sql } from 'kysely';
export async function up(db) {
    await db.schema.dropTable('mt5_accounts').ifExists().execute();
    await db.schema
        .createTable('mt5_accounts')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('login', 'integer', (col) => col.notNull())
        .addColumn('connection_type', 'varchar(16)', (col) => col.notNull())
        .addColumn('password_encrypted', 'text', (col) => col.notNull())
        .addColumn('host', 'varchar(255)')
        .addColumn('port', 'integer')
        .addColumn('server_name', 'varchar(255)')
        .addColumn('timeout_ms', 'integer', (col) => col.notNull().defaultTo(30000))
        .addColumn('label', 'varchar(255)')
        .addColumn('is_enabled', 'integer', (col) => col.notNull().defaultTo(1))
        .addColumn('session_id', 'varchar(255)')
        .addColumn('last_connected_at', 'text')
        .addColumn('last_error', 'text')
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .execute();
    await sql `CREATE UNIQUE INDEX idx_mt5_accounts_addr
    ON mt5_accounts(login, host, port)
    WHERE connection_type = 'address'`.execute(db);
    await sql `CREATE UNIQUE INDEX idx_mt5_accounts_srv
    ON mt5_accounts(login, server_name)
    WHERE connection_type = 'server'`.execute(db);
    await db.schema
        .createIndex('idx_mt5_accounts_enabled')
        .on('mt5_accounts')
        .columns(['is_enabled'])
        .execute();
}
export async function down(db) {
    await db.schema.dropTable('mt5_accounts').ifExists().execute();
}
//# sourceMappingURL=002_accounts_redesign.js.map