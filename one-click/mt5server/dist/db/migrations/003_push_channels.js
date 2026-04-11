import { sql } from 'kysely';
export async function up(db) {
    await db.schema
        .createTable('push_channels')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('platform', 'varchar(32)', (col) => col.notNull())
        .addColumn('config_encrypted', 'text', (col) => col.notNull())
        .addColumn('is_enabled', 'integer', (col) => col.notNull().defaultTo(1))
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .execute();
    await db.schema
        .createIndex('idx_push_channels_platform')
        .on('push_channels')
        .columns(['platform'])
        .execute();
}
export async function down(db) {
    await db.schema.dropTable('push_channels').ifExists().execute();
}
//# sourceMappingURL=003_push_channels.js.map