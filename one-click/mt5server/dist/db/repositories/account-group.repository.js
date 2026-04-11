export class AccountGroupRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        return this.db
            .selectFrom('account_groups')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
    }
    async findAll(filter) {
        let query = this.db.selectFrom('account_groups').selectAll();
        if (filter?.isEnabled !== undefined) {
            query = query.where('is_enabled', '=', filter.isEnabled ? 1 : 0);
        }
        return query.orderBy('id', 'asc').execute();
    }
    async create(group) {
        return this.db
            .insertInto('account_groups')
            .values(group)
            .returningAll()
            .executeTakeFirstOrThrow();
    }
    async update(id, data) {
        return this.db
            .updateTable('account_groups')
            .set({ ...data, updated_at: new Date().toISOString() })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirst();
    }
    async deleteById(id) {
        const result = await this.db
            .deleteFrom('account_groups')
            .where('id', '=', id)
            .executeTakeFirst();
        return BigInt(result.numDeletedRows) > 0n;
    }
    async findByIdWithAccounts(id) {
        const group = await this.findById(id);
        if (!group)
            return undefined;
        return this.attachAccounts(group);
    }
    async findAllWithAccounts(filter) {
        const groups = await this.findAll(filter);
        return Promise.all(groups.map((g) => this.attachAccounts(g)));
    }
    async existsByAccountId(accountId) {
        const row = await this.db
            .selectFrom('account_groups')
            .select('id')
            .where((eb) => eb.or([
            eb('account_a_id', '=', accountId),
            eb('account_b_id', '=', accountId),
        ]))
            .executeTakeFirst();
        return row !== undefined;
    }
    async attachAccounts(group) {
        const [accountA, accountB] = await Promise.all([
            this.db.selectFrom('mt5_accounts').selectAll().where('id', '=', group.account_a_id).executeTakeFirstOrThrow(),
            this.db.selectFrom('mt5_accounts').selectAll().where('id', '=', group.account_b_id).executeTakeFirstOrThrow(),
        ]);
        return { ...group, accountA, accountB };
    }
}
//# sourceMappingURL=account-group.repository.js.map