export class SpreadSubscriptionRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        return this.db
            .selectFrom('spread_subscriptions')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
    }
    async findAllByAccountGroupId(accountGroupId) {
        return this.db
            .selectFrom('spread_subscriptions')
            .selectAll()
            .where('account_group_id', '=', accountGroupId)
            .orderBy('id', 'asc')
            .execute();
    }
    async findEnabled() {
        return this.db
            .selectFrom('spread_subscriptions')
            .selectAll()
            .where('is_enabled', '=', 1)
            .orderBy('id', 'asc')
            .execute();
    }
    async disableAllAutoTradeEnabled() {
        const result = await this.db
            .updateTable('spread_subscriptions')
            .set({
            auto_trade_enabled: 0,
            updated_at: new Date().toISOString(),
        })
            .where('auto_trade_enabled', '=', 1)
            .executeTakeFirst();
        return Number(result.numUpdatedRows ?? 0);
    }
    async create(data) {
        return this.db
            .insertInto('spread_subscriptions')
            .values(data)
            .returningAll()
            .executeTakeFirstOrThrow();
    }
    async update(id, data) {
        await this.db
            .updateTable('spread_subscriptions')
            .set({ ...data, updated_at: new Date().toISOString() })
            .where('id', '=', id)
            .executeTakeFirst();
        return this.findById(id);
    }
    async deleteById(id) {
        const result = await this.db
            .deleteFrom('spread_subscriptions')
            .where('id', '=', id)
            .executeTakeFirst();
        return BigInt(result.numDeletedRows) > 0n;
    }
}
//# sourceMappingURL=spread-subscription.repository.js.map