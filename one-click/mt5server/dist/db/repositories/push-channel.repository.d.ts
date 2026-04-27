import type { Kysely } from 'kysely';
import type { Database, PushChannel, NewPushChannel, PushChannelUpdate } from '../kysely/database.js';
export interface IPushChannelRepository {
    findById(id: number): Promise<PushChannel | undefined>;
    findAll(): Promise<PushChannel[]>;
    findEnabled(): Promise<PushChannel[]>;
    create(channel: NewPushChannel): Promise<PushChannel>;
    update(id: number, data: PushChannelUpdate): Promise<PushChannel | undefined>;
    deleteById(id: number): Promise<boolean>;
}
export declare class PushChannelRepository implements IPushChannelRepository {
    private readonly db;
    constructor(db: Kysely<Database>);
    findById(id: number): Promise<PushChannel | undefined>;
    findAll(): Promise<PushChannel[]>;
    findEnabled(): Promise<PushChannel[]>;
    create(channel: NewPushChannel): Promise<PushChannel>;
    update(id: number, data: PushChannelUpdate): Promise<PushChannel | undefined>;
    deleteById(id: number): Promise<boolean>;
}
//# sourceMappingURL=push-channel.repository.d.ts.map