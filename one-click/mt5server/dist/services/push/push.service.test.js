import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PushService } from './index.js';
import { encrypt } from '../../lib/crypto.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
function fakeChannel(overrides) {
    return {
        id: 1,
        name: 'My Telegram',
        platform: 'telegram',
        config_encrypted: encrypt(JSON.stringify({ botToken: 'tok', chatId: '123' }), TEST_KEY),
        is_enabled: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        ...overrides,
    };
}
function mockRepo() {
    return {
        findById: vi.fn(),
        findAll: vi.fn().mockResolvedValue([]),
        findEnabled: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        deleteById: vi.fn(),
    };
}
describe('PushService', () => {
    let repo;
    let svc;
    beforeEach(() => {
        repo = mockRepo();
        svc = new PushService(repo, TEST_KEY);
    });
    describe('list', () => {
        it('returns mapped DTOs (config is NOT exposed)', async () => {
            vi.mocked(repo.findAll).mockResolvedValue([fakeChannel()]);
            const result = await svc.list();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('My Telegram');
            expect(result[0].platform).toBe('telegram');
            expect('config' in result[0]).toBe(false);
            expect('configEncrypted' in result[0]).toBe(false);
        });
    });
    describe('create', () => {
        it('creates a channel with encrypted config', async () => {
            vi.mocked(repo.create).mockResolvedValue(fakeChannel());
            const dto = await svc.create({
                name: 'My TG',
                platform: 'telegram',
                config: { botToken: 'tok', chatId: '123' },
            });
            expect(repo.create).toHaveBeenCalledTimes(1);
            const arg = vi.mocked(repo.create).mock.calls[0][0];
            expect(arg.config_encrypted).toBeTruthy();
            expect(arg.config_encrypted).not.toContain('tok');
            expect(dto.platform).toBe('telegram');
        });
        it('rejects unsupported platform', async () => {
            await expect(svc.create({ name: 'x', platform: 'feishu', config: {} })).rejects.toThrow(ValidationError);
        });
    });
    describe('update', () => {
        it('updates name and isEnabled', async () => {
            vi.mocked(repo.findById).mockResolvedValue(fakeChannel());
            vi.mocked(repo.update).mockResolvedValue(fakeChannel({ name: 'Updated' }));
            const dto = await svc.update(1, { name: 'Updated', isEnabled: false });
            expect(dto.name).toBe('Updated');
        });
        it('throws NotFoundError', async () => {
            vi.mocked(repo.findById).mockResolvedValue(undefined);
            await expect(svc.update(999, { name: 'x' })).rejects.toThrow(NotFoundError);
        });
    });
    describe('delete', () => {
        it('deletes existing channel', async () => {
            vi.mocked(repo.findById).mockResolvedValue(fakeChannel());
            vi.mocked(repo.deleteById).mockResolvedValue(true);
            await svc.delete(1);
            expect(repo.deleteById).toHaveBeenCalledWith(1);
        });
        it('throws NotFoundError', async () => {
            vi.mocked(repo.findById).mockResolvedValue(undefined);
            await expect(svc.delete(999)).rejects.toThrow(NotFoundError);
        });
    });
});
//# sourceMappingURL=push.service.test.js.map