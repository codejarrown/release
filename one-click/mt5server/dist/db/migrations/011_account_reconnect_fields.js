export async function up(db) {
    await db.schema
        .alterTable('mt5_accounts')
        .addColumn('auto_reconnect_enabled', 'integer', (col) => col.notNull().defaultTo(1))
        .execute();
    await db.schema
        .alterTable('mt5_accounts')
        .addColumn('reconnect_delay_ms', 'integer', (col) => col.notNull().defaultTo(0))
        .execute();
    await db.schema
        .alterTable('mt5_accounts')
        .addColumn('max_reconnect_attempts', 'integer', (col) => col.notNull().defaultTo(1))
        .execute();
}
export async function down(db) {
    await db.schema.alterTable('mt5_accounts').dropColumn('max_reconnect_attempts').execute();
    await db.schema.alterTable('mt5_accounts').dropColumn('reconnect_delay_ms').execute();
    await db.schema.alterTable('mt5_accounts').dropColumn('auto_reconnect_enabled').execute();
}
//# sourceMappingURL=011_account_reconnect_fields.js.map