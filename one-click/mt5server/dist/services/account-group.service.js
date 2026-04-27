import { NotFoundError, ValidationError } from '../lib/errors.js';
// ---- Service ----
export class AccountGroupService {
    groupRepo;
    accountRepo;
    constructor(groupRepo, accountRepo) {
        this.groupRepo = groupRepo;
        this.accountRepo = accountRepo;
    }
    async list(filter) {
        const rows = await this.groupRepo.findAllWithAccounts(filter);
        return rows.map(toDto);
    }
    async getById(id) {
        const row = await this.groupRepo.findByIdWithAccounts(id);
        if (!row)
            throw new NotFoundError('AccountGroup', id);
        return toDto(row);
    }
    async create(input) {
        await this.validatePair(input.accountAId, input.accountBId);
        const row = await this.groupRepo.create({
            name: input.name,
            account_a_id: input.accountAId,
            account_b_id: input.accountBId,
        });
        const full = await this.groupRepo.findByIdWithAccounts(row.id);
        return toDto(full);
    }
    async update(id, input) {
        const existing = await this.groupRepo.findById(id);
        if (!existing)
            throw new NotFoundError('AccountGroup', id);
        const aId = input.accountAId ?? existing.account_a_id;
        const bId = input.accountBId ?? existing.account_b_id;
        if (input.accountAId !== undefined || input.accountBId !== undefined) {
            await this.validatePair(aId, bId);
        }
        const data = {};
        if (input.name !== undefined)
            data.name = input.name;
        if (input.accountAId !== undefined)
            data.account_a_id = input.accountAId;
        if (input.accountBId !== undefined)
            data.account_b_id = input.accountBId;
        if (input.isEnabled !== undefined)
            data.is_enabled = input.isEnabled ? 1 : 0;
        if (Object.keys(data).length > 0) {
            await this.groupRepo.update(id, data);
        }
        const full = await this.groupRepo.findByIdWithAccounts(id);
        return toDto(full);
    }
    async delete(id) {
        const existing = await this.groupRepo.findById(id);
        if (!existing)
            throw new NotFoundError('AccountGroup', id);
        await this.groupRepo.deleteById(id);
    }
    async listAccountOptions(filter) {
        const rows = await this.accountRepo.findAll(filter);
        return rows.map(toSummary);
    }
    async isAccountReferenced(accountId) {
        return this.groupRepo.existsByAccountId(accountId);
    }
    async validatePair(aId, bId) {
        const ids = [...new Set([aId, bId])];
        const results = await Promise.all(ids.map((id) => this.accountRepo.findById(id)));
        for (let i = 0; i < ids.length; i++) {
            if (!results[i])
                throw new ValidationError(`账号 (id=${ids[i]}) 不存在`);
        }
    }
}
function toSummary(acct) {
    return {
        id: acct.id,
        login: acct.login,
        label: acct.label,
        connectionType: acct.connection_type,
        isEnabled: acct.is_enabled === 1,
        sessionId: acct.session_id,
    };
}
function toDto(row) {
    return {
        id: row.id,
        name: row.name,
        accountAId: row.account_a_id,
        accountBId: row.account_b_id,
        accountA: toSummary(row.accountA),
        accountB: toSummary(row.accountB),
        isEnabled: row.is_enabled === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=account-group.service.js.map