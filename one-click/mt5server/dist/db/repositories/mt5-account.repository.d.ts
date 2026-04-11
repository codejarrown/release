import type { Kysely } from 'kysely';
import type { Database, Mt5Account, NewMt5Account, Mt5AccountUpdate } from '../kysely/database.js';
export interface AccountListFilter {
    isEnabled?: boolean;
}
export interface IMt5AccountRepository {
    findById(id: number): Promise<Mt5Account | undefined>;
    findAll(filter?: AccountListFilter): Promise<Mt5Account[]>;
    create(account: NewMt5Account): Promise<Mt5Account>;
    update(id: number, data: Mt5AccountUpdate): Promise<Mt5Account | undefined>;
    deleteById(id: number): Promise<boolean>;
}
export declare class Mt5AccountRepository implements IMt5AccountRepository {
    private readonly db;
    constructor(db: Kysely<Database>);
    findById(id: number): Promise<Mt5Account | undefined>;
    findAll(filter?: AccountListFilter): Promise<Mt5Account[]>;
    create(account: NewMt5Account): Promise<Mt5Account>;
    update(id: number, data: Mt5AccountUpdate): Promise<Mt5Account | undefined>;
    deleteById(id: number): Promise<boolean>;
}
//# sourceMappingURL=mt5-account.repository.d.ts.map