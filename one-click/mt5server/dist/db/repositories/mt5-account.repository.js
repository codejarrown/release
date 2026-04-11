export class Mt5AccountRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        return this.db
            .selectFrom('mt5_accounts')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
    }
    async findAll(filter) {
        let query = this.db.selectFrom('mt5_accounts').selectAll();
        if (filter?.isEnabled !== undefined) {
            query = query.where('is_enabled', '=', filter.isEnabled ? 1 : 0);
        }
        return query.orderBy('id', 'asc').execute();
    }
    async create(account) {
        return this.db
            .insertInto('mt5_accounts')
            .values(account)
            .returningAll()
            .executeTakeFirstOrThrow();
    }
    async update(id, data) {
        return this.db
            .updateTable('mt5_accounts')
            .set({ ...data, updated_at: new Date().toISOString() })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirst();
    }
    async deleteById(id) {
        const result = await this.db
            .deleteFrom('mt5_accounts')
            .where('id', '=', id)
            .executeTakeFirst();
        return BigInt(result.numDeletedRows) > 0n;
    }
}
//# sourceMappingURL=mt5-account.repository.js.map