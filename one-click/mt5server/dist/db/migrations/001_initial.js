export async function up(db) {
    await db.schema
        .createTable('mt5_accounts')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('login', 'integer', (col) => col.notNull())
        .addColumn('server', 'varchar(255)', (col) => col.notNull())
        .addColumn('session_id', 'varchar(255)')
        .addColumn('user_name', 'varchar(255)')
        .addColumn('balance', 'real')
        .addColumn('currency', 'varchar(16)')
        .addColumn('connected_at', 'text')
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo('(datetime(\'now\'))'))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo('(datetime(\'now\'))'))
        .execute();
    await db.schema
        .createIndex('idx_mt5_accounts_login_server')
        .on('mt5_accounts')
        .columns(['login', 'server'])
        .unique()
        .execute();
    await db.schema
        .createTable('sync_jobs')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('job_type', 'varchar(100)', (col) => col.notNull())
        .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
        .addColumn('account_login', 'integer')
        .addColumn('error_message', 'text')
        .addColumn('retry_count', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('started_at', 'text')
        .addColumn('completed_at', 'text')
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo('(datetime(\'now\'))'))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo('(datetime(\'now\'))'))
        .execute();
    await db.schema
        .createIndex('idx_sync_jobs_status')
        .on('sync_jobs')
        .columns(['status'])
        .execute();
}
export async function down(db) {
    await db.schema.dropTable('sync_jobs').execute();
    await db.schema.dropTable('mt5_accounts').execute();
}
//# sourceMappingURL=001_initial.js.map