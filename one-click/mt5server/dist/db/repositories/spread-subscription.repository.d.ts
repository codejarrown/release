import type { Kysely } from 'kysely';
import type { Database, SpreadSubscription, NewSpreadSubscription, SpreadSubscriptionUpdate } from '../kysely/database.js';
export interface ISpreadSubscriptionRepository {
    findById(id: number): Promise<SpreadSubscription | undefined>;
    findAllByAccountGroupId(accountGroupId: number): Promise<SpreadSubscription[]>;
    findEnabled(): Promise<SpreadSubscription[]>;
    disableAllAutoTradeEnabled(): Promise<number>;
    create(data: NewSpreadSubscription): Promise<SpreadSubscription>;
    update(id: number, data: SpreadSubscriptionUpdate): Promise<SpreadSubscription | undefined>;
    deleteById(id: number): Promise<boolean>;
}
export declare class SpreadSubscriptionRepository implements ISpreadSubscriptionRepository {
    private readonly db;
    constructor(db: Kysely<Database>);
    findById(id: number): Promise<SpreadSubscription | undefined>;
    findAllByAccountGroupId(accountGroupId: number): Promise<SpreadSubscription[]>;
    findEnabled(): Promise<SpreadSubscription[]>;
    disableAllAutoTradeEnabled(): Promise<number>;
    create(data: NewSpreadSubscription): Promise<SpreadSubscription>;
    update(id: number, data: SpreadSubscriptionUpdate): Promise<SpreadSubscription | undefined>;
    deleteById(id: number): Promise<boolean>;
}
//# sourceMappingURL=spread-subscription.repository.d.ts.map