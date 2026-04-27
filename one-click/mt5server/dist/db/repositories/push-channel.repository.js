export class PushChannelRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        return this.db
            .selectFrom('push_channels')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
    }
    async findAll() {
        return this.db
            .selectFrom('push_channels')
            .selectAll()
            .orderBy('id', 'asc')
            .execute();
    }
    async findEnabled() {
        return this.db
            .selectFrom('push_channels')
            .selectAll()
            .where('is_enabled', '=', 1)
            .execute();
    }
    async create(channel) {
        return this.db
            .insertInto('push_channels')
            .values(channel)
            .returningAll()
            .executeTakeFirstOrThrow();
    }
    async update(id, data) {
        return this.db
            .updateTable('push_channels')
            .set({ ...data, updated_at: new Date().toISOString() })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirst();
    }
    async deleteById(id) {
        const result = await this.db
            .deleteFrom('push_channels')
            .where('id', '=', id)
            .executeTakeFirst();
        return BigInt(result.numDeletedRows) > 0n;
    }
}
//# sourceMappingURL=push-channel.repository.js.map