import { sql } from 'kysely';
export async function up(db) {
    await db.schema
        .alterTable('mt5_accounts')
        .addColumn('default_subscriptions', 'text')
        .execute();
    // Initialize existing rows to NULL explicitly (no-op for new rows, keeps migration idempotent in intent).
    await sql `UPDATE mt5_accounts SET default_subscriptions = NULL`.execute(db);
}
export async function down(db) {
    await db.schema
        .alterTable('mt5_accounts')
        .dropColumn('default_subscriptions')
        .execute();
}
//# sourceMappingURL=007_default_subscriptions.js.map