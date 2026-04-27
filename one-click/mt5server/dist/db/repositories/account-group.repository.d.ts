import type { Kysely } from 'kysely';
import type { Database, AccountGroup, NewAccountGroup, AccountGroupUpdate, Mt5Account } from '../kysely/database.js';
export interface AccountGroupWithAccounts extends AccountGroup {
    accountA: Mt5Account;
    accountB: Mt5Account;
}
export interface IAccountGroupRepository {
    findById(id: number): Promise<AccountGroup | undefined>;
    findAll(filter?: {
        isEnabled?: boolean;
    }): Promise<AccountGroup[]>;
    create(group: NewAccountGroup): Promise<AccountGroup>;
    update(id: number, data: AccountGroupUpdate): Promise<AccountGroup | undefined>;
    deleteById(id: number): Promise<boolean>;
    findByIdWithAccounts(id: number): Promise<AccountGroupWithAccounts | undefined>;
    findAllWithAccounts(filter?: {
        isEnabled?: boolean;
    }): Promise<AccountGroupWithAccounts[]>;
    existsByAccountId(accountId: number): Promise<boolean>;
}
export declare class AccountGroupRepository implements IAccountGroupRepository {
    private readonly db;
    constructor(db: Kysely<Database>);
    findById(id: number): Promise<AccountGroup | undefined>;
    findAll(filter?: {
        isEnabled?: boolean;
    }): Promise<AccountGroup[]>;
    create(group: NewAccountGroup): Promise<AccountGroup>;
    update(id: number, data: AccountGroupUpdate): Promise<AccountGroup | undefined>;
    deleteById(id: number): Promise<boolean>;
    findByIdWithAccounts(id: number): Promise<AccountGroupWithAccounts | undefined>;
    findAllWithAccounts(filter?: {
        isEnabled?: boolean;
    }): Promise<AccountGroupWithAccounts[]>;
    existsByAccountId(accountId: number): Promise<boolean>;
    private attachAccounts;
}
//# sourceMappingURL=account-group.repository.d.ts.map