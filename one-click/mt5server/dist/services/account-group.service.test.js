import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountGroupService } from './account-group.service.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
function fakeAccount(id, overrides) {
    return {
        id,
        login: 10000 + id,
        connection_type: 'address',
        password_encrypted: 'enc',
        host: '10.0.0.' + id,
        port: 443,
        server_name: null,
        timeout_ms: 30000,
        label: `Account ${id}`,
        is_enabled: 1,
        session_id: null,
        last_connected_at: null,
        last_error: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        ...overrides,
    };
}
function fakeGroup(overrides) {
    return {
        id: 1,
        name: 'Arb Pair 1',
        account_a_id: 1,
        account_b_id: 2,
        is_enabled: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        ...overrides,
    };
}
function fakeGroupWith(overrides) {
    const g = fakeGroup(overrides);
    return {
        ...g,
        accountA: fakeAccount(g.account_a_id),
        accountB: fakeAccount(g.account_b_id),
    };
}
function mockGroupRepo() {
    return {
        findById: vi.fn(),
        findAll: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        deleteById: vi.fn(),
        findByIdWithAccounts: vi.fn(),
        findAllWithAccounts: vi.fn().mockResolvedValue([]),
        existsByAccountId: vi.fn().mockResolvedValue(false),
    };
}
function mockAccountRepo() {
    return {
        findById: vi.fn().mockImplementation((id) => Promise.resolve(fakeAccount(id))),
        findAll: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        deleteById: vi.fn(),
    };
}
describe('AccountGroupService', () => {
    let groupRepo;
    let accountRepo;
    let svc;
    beforeEach(() => {
        groupRepo = mockGroupRepo();
        accountRepo = mockAccountRepo();
        svc = new AccountGroupService(groupRepo, accountRepo);
    });
    describe('list', () => {
        it('returns DTOs with account summaries', async () => {
            vi.mocked(groupRepo.findAllWithAccounts).mockResolvedValue([fakeGroupWith()]);
            const result = await svc.list();
            expect(result).toHaveLength(1);
            expect(result[0].accountA.login).toBe(10001);
            expect(result[0].accountB.login).toBe(10002);
            expect(result[0].isEnabled).toBe(true);
        });
    });
    describe('getById', () => {
        it('returns group DTO', async () => {
            vi.mocked(groupRepo.findByIdWithAccounts).mockResolvedValue(fakeGroupWith());
            const dto = await svc.getById(1);
            expect(dto.name).toBe('Arb Pair 1');
            expect(dto.accountAId).toBe(1);
            expect(dto.accountBId).toBe(2);
        });
        it('throws NotFoundError', async () => {
            vi.mocked(groupRepo.findByIdWithAccounts).mockResolvedValue(undefined);
            await expect(svc.getById(999)).rejects.toThrow(NotFoundError);
        });
    });
    describe('create', () => {
        it('creates a group with valid pair', async () => {
            vi.mocked(groupRepo.create).mockResolvedValue(fakeGroup());
            vi.mocked(groupRepo.findByIdWithAccounts).mockResolvedValue(fakeGroupWith());
            const dto = await svc.create({ name: 'Arb Pair 1', accountAId: 1, accountBId: 2 });
            expect(dto.accountAId).toBe(1);
            expect(dto.accountBId).toBe(2);
            expect(groupRepo.create).toHaveBeenCalledWith({
                name: 'Arb Pair 1',
                account_a_id: 1,
                account_b_id: 2,
            });
        });
        it('allows same A and B', async () => {
            vi.mocked(groupRepo.create).mockResolvedValue(fakeGroup({ account_a_id: 1, account_b_id: 1 }));
            vi.mocked(groupRepo.findByIdWithAccounts).mockResolvedValue(fakeGroupWith({ account_a_id: 1, account_b_id: 1 }));
            const dto = await svc.create({ name: 'Same pair', accountAId: 1, accountBId: 1 });
            expect(dto.accountAId).toBe(1);
            expect(dto.accountBId).toBe(1);
        });
        it('rejects non-existent account A', async () => {
            vi.mocked(accountRepo.findById).mockImplementation((id) => Promise.resolve(id === 1 ? undefined : fakeAccount(id)));
            await expect(svc.create({ name: 'bad', accountAId: 1, accountBId: 2 })).rejects.toThrow(ValidationError);
        });
        it('rejects non-existent account B', async () => {
            vi.mocked(accountRepo.findById).mockImplementation((id) => Promise.resolve(id === 2 ? undefined : fakeAccount(id)));
            await expect(svc.create({ name: 'bad', accountAId: 1, accountBId: 2 })).rejects.toThrow(ValidationError);
        });
    });
    describe('update', () => {
        it('updates name', async () => {
            vi.mocked(groupRepo.findById).mockResolvedValue(fakeGroup());
            vi.mocked(groupRepo.update).mockResolvedValue(fakeGroup({ name: 'Renamed' }));
            vi.mocked(groupRepo.findByIdWithAccounts).mockResolvedValue(fakeGroupWith({ name: 'Renamed' }));
            const dto = await svc.update(1, { name: 'Renamed' });
            expect(dto.name).toBe('Renamed');
        });
        it('re-validates pair when changing accounts', async () => {
            vi.mocked(groupRepo.findById).mockResolvedValue(fakeGroup());
            vi.mocked(groupRepo.update).mockResolvedValue(fakeGroup({ account_b_id: 3 }));
            vi.mocked(groupRepo.findByIdWithAccounts).mockResolvedValue(fakeGroupWith({ account_b_id: 3 }));
            const dto = await svc.update(1, { accountBId: 3 });
            expect(dto.accountBId).toBe(3);
        });
        it('throws NotFoundError', async () => {
            vi.mocked(groupRepo.findById).mockResolvedValue(undefined);
            await expect(svc.update(999, { name: 'x' })).rejects.toThrow(NotFoundError);
        });
    });
    describe('delete', () => {
        it('deletes existing group', async () => {
            vi.mocked(groupRepo.findById).mockResolvedValue(fakeGroup());
            vi.mocked(groupRepo.deleteById).mockResolvedValue(true);
            await svc.delete(1);
            expect(groupRepo.deleteById).toHaveBeenCalledWith(1);
        });
        it('throws NotFoundError', async () => {
            vi.mocked(groupRepo.findById).mockResolvedValue(undefined);
            await expect(svc.delete(999)).rejects.toThrow(NotFoundError);
        });
    });
    describe('isAccountReferenced', () => {
        it('returns true when account is used in a group', async () => {
            vi.mocked(groupRepo.existsByAccountId).mockResolvedValue(true);
            expect(await svc.isAccountReferenced(1)).toBe(true);
        });
        it('returns false when account is not used', async () => {
            vi.mocked(groupRepo.existsByAccountId).mockResolvedValue(false);
            expect(await svc.isAccountReferenced(99)).toBe(false);
        });
    });
});
//# sourceMappingURL=account-group.service.test.js.map