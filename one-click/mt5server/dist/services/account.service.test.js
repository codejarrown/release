import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountService } from './account.service.js';
import { encrypt } from '../lib/crypto.js';
import { NotFoundError, ValidationError, ConflictError, ServiceUnavailableError } from '../lib/errors.js';
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
function fakeAccount(overrides) {
    return {
        id: 1,
        login: 12345,
        connection_type: 'address',
        password_encrypted: encrypt('secret', TEST_KEY),
        host: '192.168.1.1',
        port: 443,
        server_name: null,
        timeout_ms: 30000,
        label: null,
        is_enabled: 1,
        session_id: null,
        last_connected_at: null,
        last_error: null,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        ...overrides,
    };
}
function mockRepo() {
    return {
        findById: vi.fn(),
        findAll: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        deleteById: vi.fn(),
    };
}
function mockSdk() {
    return {
        session: {
            connectByAddress: vi.fn().mockResolvedValue({ sessionId: 'sess-1' }),
            connectByServer: vi.fn().mockResolvedValue({ sessionId: 'sess-2' }),
            disconnect: vi.fn().mockResolvedValue({ success: true }),
        },
    };
}
describe('AccountService', () => {
    let repo;
    let sdk;
    let svc;
    beforeEach(() => {
        repo = mockRepo();
        sdk = mockSdk();
        svc = new AccountService(repo, sdk, TEST_KEY);
    });
    describe('list', () => {
        it('returns mapped DTOs', async () => {
            const row = fakeAccount();
            vi.mocked(repo.findAll).mockResolvedValue([row]);
            const result = await svc.list();
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(1);
            expect(result[0].connectionType).toBe('address');
            expect(result[0].isEnabled).toBe(true);
            // password must not be in DTO
            expect('password' in result[0]).toBe(false);
            expect('passwordEncrypted' in result[0]).toBe(false);
        });
    });
    describe('getById', () => {
        it('returns account DTO', async () => {
            vi.mocked(repo.findById).mockResolvedValue(fakeAccount());
            const dto = await svc.getById(1);
            expect(dto.login).toBe(12345);
        });
        it('throws NotFoundError', async () => {
            vi.mocked(repo.findById).mockResolvedValue(undefined);
            await expect(svc.getById(999)).rejects.toThrow(NotFoundError);
        });
    });
    describe('create', () => {
        it('creates address account', async () => {
            const created = fakeAccount();
            vi.mocked(repo.create).mockResolvedValue(created);
            const dto = await svc.create({
                login: 12345,
                password: 'secret',
                connectionType: 'address',
                host: '192.168.1.1',
                port: 443,
            });
            expect(repo.create).toHaveBeenCalledTimes(1);
            const arg = vi.mocked(repo.create).mock.calls[0][0];
            expect(arg.login).toBe(12345);
            expect(arg.connection_type).toBe('address');
            expect(arg.password_encrypted).toBeTruthy();
            expect(arg.password_encrypted).not.toBe('secret');
            expect(dto.id).toBe(1);
        });
        it('validates address requires host+port', async () => {
            await expect(svc.create({ login: 1, password: 'x', connectionType: 'address' })).rejects.toThrow(ValidationError);
        });
        it('validates server requires serverName', async () => {
            await expect(svc.create({ login: 1, password: 'x', connectionType: 'server' })).rejects.toThrow(ValidationError);
        });
    });
    describe('update', () => {
        it('updates fields including re-encrypted password', async () => {
            const existing = fakeAccount();
            vi.mocked(repo.findById).mockResolvedValue(existing);
            vi.mocked(repo.update).mockResolvedValue(fakeAccount({ label: 'new' }));
            const dto = await svc.update(1, { password: 'new-pass', label: 'new' });
            expect(dto.label).toBe('new');
            const updateArg = vi.mocked(repo.update).mock.calls[0][1];
            expect(updateArg.password_encrypted).toBeTruthy();
        });
        it('throws NotFoundError for missing account', async () => {
            vi.mocked(repo.findById).mockResolvedValue(undefined);
            await expect(svc.update(999, { label: 'x' })).rejects.toThrow(NotFoundError);
        });
    });
    describe('delete', () => {
        it('disconnects session before deletion', async () => {
            vi.mocked(repo.findById).mockResolvedValue(fakeAccount({ session_id: 'sess-1' }));
            vi.mocked(repo.deleteById).mockResolvedValue(true);
            await svc.delete(1);
            expect(sdk.session.disconnect).toHaveBeenCalledWith('sess-1');
            expect(repo.deleteById).toHaveBeenCalledWith(1);
        });
        it('throws NotFoundError', async () => {
            vi.mocked(repo.findById).mockResolvedValue(undefined);
            await expect(svc.delete(999)).rejects.toThrow(NotFoundError);
        });
    });
    describe('connect', () => {
        it('connects by address and stores sessionId', async () => {
            const acct = fakeAccount();
            vi.mocked(repo.findById).mockResolvedValue(acct);
            vi.mocked(repo.update).mockResolvedValue(fakeAccount({ session_id: 'sess-1' }));
            const result = await svc.connect(1);
            expect(result.sessionId).toBe('sess-1');
            expect(sdk.session.connectByAddress).toHaveBeenCalledWith(expect.objectContaining({ user: 12345, host: '192.168.1.1', port: 443 }));
        });
        it('connects by server name', async () => {
            const acct = fakeAccount({
                connection_type: 'server',
                host: null,
                port: null,
                server_name: 'MT5-Demo',
            });
            vi.mocked(repo.findById).mockResolvedValue(acct);
            vi.mocked(repo.update).mockResolvedValue(fakeAccount({ session_id: 'sess-2' }));
            const result = await svc.connect(1);
            expect(result.sessionId).toBe('sess-2');
            expect(sdk.session.connectByServer).toHaveBeenCalledWith(expect.objectContaining({ user: 12345, serverName: 'MT5-Demo' }));
        });
        it('throws ConflictError if account is disabled', async () => {
            vi.mocked(repo.findById).mockResolvedValue(fakeAccount({ is_enabled: 0 }));
            await expect(svc.connect(1)).rejects.toThrow(ConflictError);
        });
        it('wraps SDK errors as ServiceUnavailableError', async () => {
            vi.mocked(repo.findById).mockResolvedValue(fakeAccount());
            vi.mocked(repo.update).mockResolvedValue(fakeAccount());
            vi.mocked(sdk.session.connectByAddress).mockRejectedValue(new Error('timeout'));
            await expect(svc.connect(1)).rejects.toThrow(ServiceUnavailableError);
            const updateArg = vi.mocked(repo.update).mock.calls[0][1];
            expect(updateArg.last_error).toContain('timeout');
        });
    });
    describe('disconnect', () => {
        it('disconnects and clears sessionId', async () => {
            vi.mocked(repo.findById).mockResolvedValue(fakeAccount({ session_id: 'sess-1' }));
            vi.mocked(repo.update).mockResolvedValue(fakeAccount({ session_id: null }));
            await svc.disconnect(1);
            expect(sdk.session.disconnect).toHaveBeenCalledWith('sess-1');
            expect(repo.update).toHaveBeenCalledWith(1, { session_id: null });
        });
        it('throws ConflictError if not connected', async () => {
            vi.mocked(repo.findById).mockResolvedValue(fakeAccount({ session_id: null }));
            await expect(svc.disconnect(1)).rejects.toThrow(ConflictError);
        });
    });
});
//# sourceMappingURL=account.service.test.js.map