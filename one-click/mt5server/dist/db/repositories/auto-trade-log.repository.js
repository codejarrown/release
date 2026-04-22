export class AutoTradeLogRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        return this.db
            .insertInto('auto_trade_logs')
            .values(data)
            .returningAll()
            .executeTakeFirstOrThrow();
    }
    async findAll(filter) {
        let query = this.db
            .selectFrom('auto_trade_logs')
            .selectAll();
        if (filter?.accountGroupId !== undefined) {
            query = query.where('account_group_id', '=', filter.accountGroupId);
        }
        if (filter?.subscriptionId !== undefined) {
            query = query.where('subscription_id', '=', filter.subscriptionId);
        }
        if (filter?.phase !== undefined) {
            query = query.where('phase', '=', filter.phase);
        }
        if (filter?.level !== undefined) {
            query = query.where('level', '=', filter.level);
        }
        if (filter?.direction !== undefined) {
            query = query.where('direction', '=', filter.direction);
        }
        if (filter?.action !== undefined) {
            query = query.where('action', '=', filter.action);
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
            .selectFrom('auto_trade_logs')
            .select((eb) => eb.fn.countAll().as('count'));
        if (filter?.accountGroupId !== undefined) {
            query = query.where('account_group_id', '=', filter.accountGroupId);
        }
        if (filter?.subscriptionId !== undefined) {
            query = query.where('subscription_id', '=', filter.subscriptionId);
        }
        if (filter?.phase !== undefined) {
            query = query.where('phase', '=', filter.phase);
        }
        if (filter?.level !== undefined) {
            query = query.where('level', '=', filter.level);
        }
        if (filter?.direction !== undefined) {
            query = query.where('direction', '=', filter.direction);
        }
        if (filter?.action !== undefined) {
            query = query.where('action', '=', filter.action);
        }
        const row = await query.executeTakeFirstOrThrow();
        return Number(row.count);
    }
}
//# sourceMappingURL=auto-trade-log.repository.js.map