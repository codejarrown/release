import type { IAccountGroupRepository } from '../db/repositories/account-group.repository.js';
import type { IMt5AccountRepository } from '../db/repositories/mt5-account.repository.js';
import type { ConnectionType } from '../db/kysely/database.js';
export interface AccountSummaryDto {
    id: number;
    login: number;
    label: string | null;
    connectionType: ConnectionType;
    isEnabled: boolean;
    sessionId: string | null;
}
export interface AccountGroupDto {
    id: number;
    name: string;
    accountAId: number;
    accountBId: number;
    accountA: AccountSummaryDto;
    accountB: AccountSummaryDto;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CreateGroupInput {
    name: string;
    accountAId: number;
    accountBId: number;
}
export interface UpdateGroupInput {
    name?: string;
    accountAId?: number;
    accountBId?: number;
    isEnabled?: boolean;
}
export declare class AccountGroupService {
    private readonly groupRepo;
    private readonly accountRepo;
    constructor(groupRepo: IAccountGroupRepository, accountRepo: IMt5AccountRepository);
    list(filter?: {
        isEnabled?: boolean;
    }): Promise<AccountGroupDto[]>;
    getById(id: number): Promise<AccountGroupDto>;
    create(input: CreateGroupInput): Promise<AccountGroupDto>;
    update(id: number, input: UpdateGroupInput): Promise<AccountGroupDto>;
    delete(id: number): Promise<void>;
    listAccountOptions(filter?: {
        isEnabled?: boolean;
    }): Promise<AccountSummaryDto[]>;
    isAccountReferenced(accountId: number): Promise<boolean>;
    private validatePair;
}
//# sourceMappingURL=account-group.service.d.ts.map