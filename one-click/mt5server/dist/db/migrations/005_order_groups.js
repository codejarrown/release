import { sql } from 'kysely';
export async function up(db) {
    await db.schema
        .createTable('order_groups')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('account_group_id', 'integer')
        .addColumn('is_fully_closed', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('remark', 'text')
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .execute();
    await db.schema
        .createIndex('idx_order_groups_account_group')
        .on('order_groups')
        .columns(['account_group_id'])
        .execute();
    await db.schema
        .createTable('order_group_items')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('order_group_id', 'integer', (col) => col.notNull())
        .addColumn('account_id', 'integer', (col) => col.notNull())
        .addColumn('ticket', 'bigint')
        .addColumn('symbol', 'varchar(50)', (col) => col.notNull())
        .addColumn('order_type', 'varchar(20)', (col) => col.notNull())
        .addColumn('lots', 'real', (col) => col.notNull())
        .addColumn('open_price', 'real')
        .addColumn('close_price', 'real')
        .addColumn('profit', 'real')
        .addColumn('sl', 'real')
        .addColumn('tp', 'real')
        .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
        .addColumn('error_message', 'text')
        .addColumn('opened_at', 'text')
        .addColumn('closed_at', 'text')
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql `(datetime('now'))`))
        .execute();
    await db.schema
        .createIndex('idx_order_group_items_group')
        .on('order_group_items')
        .columns(['order_group_id'])
        .execute();
    await db.schema
        .createIndex('idx_order_group_items_account')
        .on('order_group_items')
        .columns(['account_id'])
        .execute();
    await db.schema
        .createIndex('idx_order_group_items_ticket_account')
        .on('order_group_items')
        .columns(['ticket', 'account_id'])
        .unique()
        .execute();
}
export async function down(db) {
    await db.schema.dropTable('order_group_items').ifExists().execute();
    await db.schema.dropTable('order_groups').ifExists().execute();
}
//# sourceMappingURL=005_order_groups.js.map