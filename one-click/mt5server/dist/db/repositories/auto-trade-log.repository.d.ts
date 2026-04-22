import type { Kysely } from 'kysely';
import type { AutoTradeLog, AutoTradeLogDirection, AutoTradeLogLevel, AutoTradeLogPhase, Database, NewAutoTradeLog } from '../kysely/database.js';
export interface AutoTradeLogListFilter {
    accountGroupId?: number;
    subscriptionId?: number;
    phase?: AutoTradeLogPhase;
    level?: AutoTradeLogLevel;
    direction?: AutoTradeLogDirection;
    action?: string;
    page?: number;
    pageSize?: number;
}
export interface IAutoTradeLogRepository {
    create(data: NewAutoTradeLog): Promise<AutoTradeLog>;
    findAll(filter?: AutoTradeLogListFilter): Promise<AutoTradeLog[]>;
    countAll(filter?: AutoTradeLogListFilter): Promise<number>;
}
export declare class AutoTradeLogRepository implements IAutoTradeLogRepository {
    private readonly db;
    constructor(db: Kysely<Database>);
    create(data: NewAutoTradeLog): Promise<AutoTradeLog>;
    findAll(filter?: AutoTradeLogListFilter): Promise<AutoTradeLog[]>;
    countAll(filter?: AutoTradeLogListFilter): Promise<number>;
}
//# sourceMappingURL=auto-trade-log.repository.d.ts.map