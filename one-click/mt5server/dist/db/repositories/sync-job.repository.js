export class SyncJobRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        return this.db
            .selectFrom('sync_jobs')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
    }
    async findByStatus(status) {
        return this.db
            .selectFrom('sync_jobs')
            .selectAll()
            .where('status', '=', status)
            .execute();
    }
    async create(job) {
        return this.db
            .insertInto('sync_jobs')
            .values(job)
            .returningAll()
            .executeTakeFirstOrThrow();
    }
    async update(id, data) {
        return this.db
            .updateTable('sync_jobs')
            .set({ ...data, updated_at: new Date().toISOString() })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirst();
    }
}
//# sourceMappingURL=sync-job.repository.js.map