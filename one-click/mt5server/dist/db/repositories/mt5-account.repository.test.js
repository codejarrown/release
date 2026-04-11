import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import SQLite from 'better-sqlite3';
import { Mt5AccountRepository } from './mt5-account.repository.js';
import { runMigrations } from '../migrator.js';
let db;
let repo;
beforeEach(async () => {
    db = new Kysely({
        dialect: new SqliteDialect({ database: new SQLite(':memory:') }),
    });
    await runMigrations(db);
    repo = new Mt5AccountRepository(db);
});
afterEach(async () => {
    await db.destroy();
});
describe('Mt5AccountRepository', () => {
    const sampleAccount = {
        login: 12345,
        connection_type: 'address',
        password_encrypted: 'enc_pass_data',
        host: '192.168.1.1',
        port: 443,
        server_name: null,
        label: 'test',
    };
    describe('create & findById', () => {
        it('creates an account and finds it by id', async () => {
            const created = await repo.create(sampleAccount);
            expect(created.id).toBeGreaterThan(0);
            expect(created.login).toBe(12345);
            expect(created.connection_type).toBe('address');
            expect(created.password_encrypted).toBe('enc_pass_data');
            expect(created.is_enabled).toBe(1);
            expect(created.timeout_ms).toBe(30000);
            const found = await repo.findById(created.id);
            expect(found).toBeDefined();
            expect(found.id).toBe(created.id);
        });
    });
    describe('findAll', () => {
        it('returns all accounts', async () => {
            await repo.create(sampleAccount);
            await repo.create({
                ...sampleAccount,
                login: 67890,
                host: '10.0.0.1',
            });
            const all = await repo.findAll();
            expect(all).toHaveLength(2);
        });
        it('filters by isEnabled', async () => {
            await repo.create(sampleAccount);
            const disabled = await repo.create({
                ...sampleAccount,
                login: 67890,
                host: '10.0.0.1',
            });
            await repo.update(disabled.id, { is_enabled: 0 });
            const enabled = await repo.findAll({ isEnabled: true });
            expect(enabled).toHaveLength(1);
            expect(enabled[0].login).toBe(12345);
            const disabledList = await repo.findAll({ isEnabled: false });
            expect(disabledList).toHaveLength(1);
            expect(disabledList[0].login).toBe(67890);
        });
    });
    describe('update', () => {
        it('updates fields', async () => {
            const created = await repo.create(sampleAccount);
            const updated = await repo.update(created.id, {
                label: 'renamed',
                session_id: 'sess-abc',
            });
            expect(updated.label).toBe('renamed');
            expect(updated.session_id).toBe('sess-abc');
        });
        it('returns undefined for non-existent id', async () => {
            const result = await repo.update(9999, { label: 'x' });
            expect(result).toBeUndefined();
        });
    });
    describe('deleteById', () => {
        it('deletes and returns true', async () => {
            const created = await repo.create(sampleAccount);
            const deleted = await repo.deleteById(created.id);
            expect(deleted).toBe(true);
            const found = await repo.findById(created.id);
            expect(found).toBeUndefined();
        });
        it('returns false for non-existent id', async () => {
            const result = await repo.deleteById(9999);
            expect(result).toBe(false);
        });
    });
    describe('unique constraints', () => {
        it('rejects duplicate (login, host, port) for address type', async () => {
            await repo.create(sampleAccount);
            await expect(repo.create(sampleAccount)).rejects.toThrow();
        });
        it('allows same login with different host/port', async () => {
            await repo.create(sampleAccount);
            const second = await repo.create({
                ...sampleAccount,
                host: '10.0.0.1',
                port: 8443,
            });
            expect(second.id).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=mt5-account.repository.test.js.map