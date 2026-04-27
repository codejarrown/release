import type { Kysely } from 'kysely';
import type { Database, SyncJob, NewSyncJob, SyncJobUpdate, SyncJobStatus } from '../kysely/database.js';
export interface ISyncJobRepository {
    findById(id: number): Promise<SyncJob | undefined>;
    findByStatus(status: SyncJobStatus): Promise<SyncJob[]>;
    create(job: NewSyncJob): Promise<SyncJob>;
    update(id: number, data: SyncJobUpdate): Promise<SyncJob | undefined>;
}
export declare class SyncJobRepository implements ISyncJobRepository {
    private readonly db;
    constructor(db: Kysely<Database>);
    findById(id: number): Promise<SyncJob | undefined>;
    findByStatus(status: SyncJobStatus): Promise<SyncJob[]>;
    create(job: NewSyncJob): Promise<SyncJob>;
    update(id: number, data: SyncJobUpdate): Promise<SyncJob | undefined>;
}
//# sourceMappingURL=sync-job.repository.d.ts.map