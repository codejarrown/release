import { sql } from 'kysely';
export class OrderGroupRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        return this.db
            .selectFrom('order_groups')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
    }
    async findAll(filter) {
        let query = this.db.selectFrom('order_groups').selectAll();
        if (filter?.accountGroupId !== undefined) {
            query = query.where('account_group_id', '=', filter.accountGroupId);
        }
        if (filter?.isFullyClosed !== undefined) {
            query = query.where('is_fully_closed', '=', filter.isFullyClosed ? 1 : 0);
        }
        if (filter?.createdDateFrom) {
            query = query.where(sql `substr(created_at, 1, 10)`, '>=', filter.createdDateFrom);
        }
        if (filter?.createdDateTo) {
            query = query.where(sql `substr(created_at, 1, 10)`, '<=', filter.createdDateTo);
        }
        query = query.orderBy('id', 'desc');
        if (filter?.page !== undefined && filter?.pageSize !== undefined) {
            const offset = (filter.page - 1) * filter.pageSize;
            query = query.offset(offset).limit(filter.pageSize);
        }
        return query.execute();
    }
    async countAll(filter) {
        let query = this.db
            .selectFrom('order_groups')
            .select(this.db.fn.countAll().as('count'));
        if (filter?.accountGroupId !== undefined) {
            query = query.where('account_group_id', '=', filter.accountGroupId);
        }
        if (filter?.isFullyClosed !== undefined) {
            query = query.where('is_fully_closed', '=', filter.isFullyClosed ? 1 : 0);
        }
        if (filter?.createdDateFrom) {
            query = query.where(sql `substr(created_at, 1, 10)`, '>=', filter.createdDateFrom);
        }
        if (filter?.createdDateTo) {
            query = query.where(sql `substr(created_at, 1, 10)`, '<=', filter.createdDateTo);
        }
        const row = await query.executeTakeFirstOrThrow();
        return Number(row.count);
    }
    async summarize(filter) {
        let query = this.db
            .selectFrom('order_groups as og')
            .leftJoin('order_group_items as item', 'item.order_group_id', 'og.id')
            .select([
            sql `count(distinct og.id)`.as('groupCount'),
            sql `count(item.id)`.as('orderCount'),
            sql `coalesce(sum(case when item.status = 'open' then 1 else 0 end), 0)`.as('openOrderCount'),
            sql `coalesce(sum(coalesce(item.profit, 0)), 0)`.as('totalProfit'),
        ]);
        if (filter?.accountGroupId !== undefined) {
            query = query.where('og.account_group_id', '=', filter.accountGroupId);
        }
        if (filter?.isFullyClosed !== undefined) {
            query = query.where('og.is_fully_closed', '=', filter.isFullyClosed ? 1 : 0);
        }
        if (filter?.createdDateFrom) {
            query = query.where(sql `substr(og.created_at, 1, 10)`, '>=', filter.createdDateFrom);
        }
        if (filter?.createdDateTo) {
            query = query.where(sql `substr(og.created_at, 1, 10)`, '<=', filter.createdDateTo);
        }
        const row = await query.executeTakeFirstOrThrow();
        return {
            groupCount: Number(row.groupCount ?? 0),
            orderCount: Number(row.orderCount ?? 0),
            openOrderCount: Number(row.openOrderCount ?? 0),
            totalProfit: Number(row.totalProfit ?? 0),
        };
    }
    async create(group) {
        return this.db
            .insertInto('order_groups')
            .values(group)
            .returningAll()
            .executeTakeFirstOrThrow();
    }
    async update(id, data) {
        return this.db
            .updateTable('order_groups')
            .set({ ...data, updated_at: new Date().toISOString() })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirst();
    }
    async deleteById(id) {
        await this.db
            .deleteFrom('order_group_items')
            .where('order_group_id', '=', id)
            .execute();
        const result = await this.db
            .deleteFrom('order_groups')
            .where('id', '=', id)
            .executeTakeFirst();
        return BigInt(result.numDeletedRows) > 0n;
    }
    async findByIdWithItems(id) {
        const group = await this.findById(id);
        if (!group)
            return undefined;
        const items = await this.findItemsByGroupId(id);
        return { ...group, items };
    }
    async findAllWithItems(filter) {
        const groups = await this.findAll(filter);
        return Promise.all(groups.map(async (g) => {
            const items = await this.findItemsByGroupId(g.id);
            return { ...g, items };
        }));
    }
    async findItemsByGroupId(groupId) {
        const rows = await this.db
            .selectFrom('order_group_items')
            .innerJoin('mt5_accounts', 'mt5_accounts.id', 'order_group_items.account_id')
            .select([
            'order_group_items.id',
            'order_group_items.order_group_id',
            'order_group_items.account_id',
            'order_group_items.ticket',
            'order_group_items.symbol',
            'order_group_items.order_type',
            'order_group_items.lots',
            'order_group_items.open_price',
            'order_group_items.close_price',
            'order_group_items.profit',
            'order_group_items.sl',
            'order_group_items.tp',
            'order_group_items.status',
            'order_group_items.error_message',
            'order_group_items.opened_at',
            'order_group_items.closed_at',
            'order_group_items.created_at',
            'order_group_items.updated_at',
            'mt5_accounts.login as account_login',
            'mt5_accounts.label as account_label',
        ])
            .where('order_group_items.order_group_id', '=', groupId)
            .orderBy('order_group_items.id', 'asc')
            .execute();
        return rows;
    }
    async findOpenItemsByGroupId(groupId) {
        const rows = await this.db
            .selectFrom('order_group_items')
            .innerJoin('mt5_accounts', 'mt5_accounts.id', 'order_group_items.account_id')
            .select([
            'order_group_items.id',
            'order_group_items.order_group_id',
            'order_group_items.account_id',
            'order_group_items.ticket',
            'order_group_items.symbol',
            'order_group_items.order_type',
            'order_group_items.lots',
            'order_group_items.open_price',
            'order_group_items.close_price',
            'order_group_items.profit',
            'order_group_items.sl',
            'order_group_items.tp',
            'order_group_items.status',
            'order_group_items.error_message',
            'order_group_items.opened_at',
            'order_group_items.closed_at',
            'order_group_items.created_at',
            'order_group_items.updated_at',
            'mt5_accounts.login as account_login',
            'mt5_accounts.label as account_label',
        ])
            .where('order_group_items.order_group_id', '=', groupId)
            .where('order_group_items.status', '=', 'open')
            .orderBy('order_group_items.id', 'asc')
            .execute();
        return rows;
    }
    async addItem(item) {
        return this.db
            .insertInto('order_group_items')
            .values(item)
            .returningAll()
            .executeTakeFirstOrThrow();
    }
    async addItems(items) {
        if (items.length === 0)
            return [];
        return this.db
            .insertInto('order_group_items')
            .values(items)
            .returningAll()
            .execute();
    }
    async updateItem(id, data) {
        return this.db
            .updateTable('order_group_items')
            .set({ ...data, updated_at: new Date().toISOString() })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirst();
    }
    async hasOpenItems(groupId) {
        const row = await this.db
            .selectFrom('order_group_items')
            .select('id')
            .where('order_group_id', '=', groupId)
            .where('status', '=', 'open')
            .executeTakeFirst();
        return row !== undefined;
    }
    async refreshFullyClosedStatus(groupId) {
        const totalRow = await this.db
            .selectFrom('order_group_items')
            .select(this.db.fn.countAll().as('count'))
            .where('order_group_id', '=', groupId)
            .executeTakeFirstOrThrow();
        const total = Number(totalRow.count);
        if (total === 0) {
            await this.update(groupId, { is_fully_closed: 0 });
            return;
        }
        const openRow = await this.db
            .selectFrom('order_group_items')
            .select(this.db.fn.countAll().as('count'))
            .where('order_group_id', '=', groupId)
            .where('status', 'in', ['open', 'pending'])
            .executeTakeFirstOrThrow();
        const openCount = Number(openRow.count);
        await this.update(groupId, { is_fully_closed: openCount === 0 ? 1 : 0 });
    }
}
//# sourceMappingURL=order-group.repository.js.map