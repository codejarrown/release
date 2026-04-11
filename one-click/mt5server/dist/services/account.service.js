import { encrypt, decrypt } from '../lib/crypto.js';
import { NotFoundError, ValidationError, ConflictError, ServiceUnavailableError } from '../lib/errors.js';
// ---- Service ----
export class AccountService {
    repo;
    mt5Sdk;
    encryptionKey;
    hooks = {};
    constructor(repo, mt5Sdk, encryptionKey) {
        this.repo = repo;
        this.mt5Sdk = mt5Sdk;
        this.encryptionKey = encryptionKey;
    }
    setHooks(hooks) {
        this.hooks = hooks;
    }
    async list(filter) {
        const rows = await this.repo.findAll(filter);
        return rows.map(toDto);
    }
    async getById(id) {
        const row = await this.repo.findById(id);
        if (!row)
            throw new NotFoundError('Account', id);
        return toDto(row);
    }
    async create(input) {
        this.validateConnectionFields(input.connectionType, input);
        const passwordEncrypted = encrypt(input.password, this.encryptionKey);
        try {
            const row = await this.repo.create({
                login: input.login,
                connection_type: input.connectionType,
                password_encrypted: passwordEncrypted,
                host: input.connectionType === 'address' ? (input.host ?? null) : null,
                port: input.connectionType === 'address' ? (input.port ?? null) : null,
                server_name: input.connectionType === 'server' ? (input.serverName ?? null) : null,
                timeout_ms: input.timeoutMs ?? 30_000,
                label: input.label ?? null,
                auto_reconnect_enabled: input.autoReconnectEnabled === undefined ? 1 : input.autoReconnectEnabled ? 1 : 0,
                reconnect_delay_ms: input.reconnectDelayMs ?? 0,
                max_reconnect_attempts: input.maxReconnectAttempts ?? 1,
            });
            return toDto(row);
        }
        catch (err) {
            throw this.normalizeAccountWriteError(err);
        }
    }
    async update(id, input) {
        const existing = await this.repo.findById(id);
        if (!existing)
            throw new NotFoundError('Account', id);
        const nextConnectionType = input.connectionType ?? existing.connection_type;
        const nextConnection = {
            host: input.host ?? existing.host ?? undefined,
            port: input.port ?? existing.port ?? undefined,
            serverName: input.serverName ?? existing.server_name ?? undefined,
        };
        const hasConnectionFieldChanges = input.connectionType !== undefined
            || input.host !== undefined
            || input.port !== undefined
            || input.serverName !== undefined;
        this.validateConnectionFields(nextConnectionType, nextConnection);
        const data = {};
        if (input.login !== undefined)
            data.login = input.login;
        if (input.connectionType !== undefined)
            data.connection_type = input.connectionType;
        if (input.password !== undefined) {
            data.password_encrypted = encrypt(input.password, this.encryptionKey);
        }
        if (hasConnectionFieldChanges) {
            if (nextConnectionType === 'address') {
                data.host = nextConnection.host ?? null;
                data.port = nextConnection.port ?? null;
                data.server_name = null;
            }
            else {
                data.host = null;
                data.port = null;
                data.server_name = nextConnection.serverName ?? null;
            }
        }
        if (input.timeoutMs !== undefined)
            data.timeout_ms = input.timeoutMs;
        if (input.label !== undefined)
            data.label = input.label;
        if (input.isEnabled !== undefined)
            data.is_enabled = input.isEnabled ? 1 : 0;
        if (input.autoReconnectEnabled !== undefined) {
            data.auto_reconnect_enabled = input.autoReconnectEnabled ? 1 : 0;
        }
        if (input.reconnectDelayMs !== undefined)
            data.reconnect_delay_ms = input.reconnectDelayMs;
        if (input.maxReconnectAttempts !== undefined)
            data.max_reconnect_attempts = input.maxReconnectAttempts;
        const requiresReconnect = input.login !== undefined
            || input.connectionType !== undefined
            || input.password !== undefined
            || input.host !== undefined
            || input.port !== undefined
            || input.serverName !== undefined
            || input.timeoutMs !== undefined;
        if (existing.session_id && requiresReconnect) {
            try {
                await this.mt5Sdk.session.disconnect(existing.session_id);
            }
            catch {
                // best-effort disconnect
            }
            data.session_id = null;
            this.hooks.onDisconnect?.(id);
        }
        if (Object.keys(data).length === 0) {
            return toDto(existing);
        }
        try {
            const row = await this.repo.update(id, data);
            return toDto(row);
        }
        catch (err) {
            throw this.normalizeAccountWriteError(err);
        }
    }
    async delete(id) {
        const existing = await this.repo.findById(id);
        if (!existing)
            throw new NotFoundError('Account', id);
        if (existing.session_id) {
            try {
                await this.mt5Sdk.session.disconnect(existing.session_id);
            }
            catch {
                // best-effort disconnect
            }
            this.hooks.onDisconnect?.(id);
        }
        try {
            const deleted = await this.repo.deleteById(id);
            if (!deleted) {
                throw new ServiceUnavailableError('Failed to delete account for unknown reasons');
            }
        }
        catch (err) {
            // 当账号被外键引用（如账号组、订单组）时，SQLite 会抛出约束错误
            if (err instanceof Error && /constraint|FOREIGN KEY/i.test(err.message)) {
                throw new ConflictError('Account is referenced by other resources (e.g. account groups or order groups) and cannot be deleted.');
            }
            throw err;
        }
    }
    async connect(id) {
        const row = await this.repo.findById(id);
        if (!row)
            throw new NotFoundError('Account', id);
        if (!row.is_enabled)
            throw new ConflictError('Account is disabled');
        const password = decrypt(row.password_encrypted, this.encryptionKey);
        try {
            let sessionId;
            if (row.connection_type === 'address') {
                const res = await this.mt5Sdk.session.connectByAddress({
                    user: row.login,
                    password,
                    host: row.host,
                    port: row.port,
                    timeoutMs: row.timeout_ms,
                });
                sessionId = res.sessionId;
            }
            else {
                const res = await this.mt5Sdk.session.connectByServer({
                    user: row.login,
                    password,
                    serverName: row.server_name,
                    timeoutMs: row.timeout_ms,
                });
                sessionId = res.sessionId;
            }
            await this.repo.update(id, {
                session_id: sessionId,
                last_connected_at: new Date().toISOString(),
                last_error: null,
            });
            // 自动恢复账号级订阅列表：如果账号有 default_subscriptions 快照，则在新 session 上执行一次批量订阅
            if (row.default_subscriptions) {
                try {
                    const symbols = JSON.parse(row.default_subscriptions);
                    if (Array.isArray(symbols) && symbols.length > 0) {
                        const cleaned = symbols
                            .map((s) => (typeof s === 'string' ? s.trim() : ''))
                            .filter((s) => s.length > 0);
                        if (cleaned.length > 0) {
                            await this.mt5Sdk.subscriptions.subscribeMultiple({ symbols: cleaned }, sessionId);
                        }
                    }
                }
                catch {
                    // 解析失败不影响连接流程，仅忽略自动订阅
                }
            }
            this.hooks.onConnect?.(id, sessionId);
            return { sessionId };
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            await this.repo.update(id, { last_error: errorMsg });
            throw new ServiceUnavailableError(`MT5 connect failed: ${errorMsg}`);
        }
    }
    async disconnect(id) {
        const row = await this.repo.findById(id);
        if (!row)
            throw new NotFoundError('Account', id);
        if (!row.session_id)
            throw new ConflictError('Account is not connected');
        try {
            await this.mt5Sdk.session.disconnect(row.session_id);
        }
        catch {
            // best-effort
        }
        await this.repo.update(id, { session_id: null });
        this.hooks.onDisconnect?.(id);
    }
    // ---- Subscriptions (per account / session) ----
    async listSubscriptions(accountId) {
        const sessionId = await this.resolveSessionId(accountId);
        return this.mt5Sdk.subscriptions.getSubscriptions(sessionId);
    }
    async getPing(accountId) {
        const sessionId = await this.resolveSessionId(accountId);
        return this.mt5Sdk.session.ping(sessionId);
    }
    async addSubscriptions(accountId, symbols) {
        if (!symbols.length) {
            throw new ValidationError('symbols must not be empty');
        }
        const sessionId = await this.resolveSessionId(accountId);
        await this.mt5Sdk.subscriptions.subscribeMultiple({ symbols }, sessionId);
        const current = await this.mt5Sdk.subscriptions.getSubscriptions(sessionId);
        await this.repo.update(accountId, {
            default_subscriptions: JSON.stringify(current),
        });
        return current;
    }
    async removeSubscriptions(accountId, symbols) {
        if (!symbols.length) {
            throw new ValidationError('symbols must not be empty');
        }
        const sessionId = await this.resolveSessionId(accountId);
        await this.mt5Sdk.subscriptions.unsubscribeMultiple({ symbols }, sessionId);
        const current = await this.mt5Sdk.subscriptions.getSubscriptions(sessionId);
        await this.repo.update(accountId, {
            default_subscriptions: JSON.stringify(current),
        });
        return current;
    }
    async resetSubscriptions(accountId) {
        const sessionId = await this.resolveSessionId(accountId);
        const current = await this.mt5Sdk.subscriptions.getSubscriptions(sessionId);
        if (current.length === 0) {
            await this.repo.update(accountId, { default_subscriptions: JSON.stringify([]) });
            return [];
        }
        await this.mt5Sdk.subscriptions.unsubscribeMultiple({ symbols: current }, sessionId);
        await this.repo.update(accountId, { default_subscriptions: JSON.stringify([]) });
        return [];
    }
    async subscribeSymbol(accountId, symbol, opts) {
        const trimmed = symbol.trim();
        if (!trimmed) {
            throw new ValidationError('symbol must not be empty');
        }
        const sessionId = await this.resolveSessionId(accountId);
        if (opts?.force) {
            await this.mt5Sdk.subscriptions.subscribeForce({ symbols: [trimmed] }, sessionId);
        }
        else {
            await this.mt5Sdk.subscriptions.subscribe({ symbol: trimmed }, sessionId);
        }
        const current = await this.mt5Sdk.subscriptions.getSubscriptions(sessionId);
        await this.repo.update(accountId, {
            default_subscriptions: JSON.stringify(current),
        });
        return current;
    }
    async unsubscribeSymbol(accountId, symbol) {
        const trimmed = symbol.trim();
        if (!trimmed) {
            throw new ValidationError('symbol must not be empty');
        }
        const sessionId = await this.resolveSessionId(accountId);
        await this.mt5Sdk.subscriptions.unsubscribe({ symbol: trimmed }, sessionId);
        const current = await this.mt5Sdk.subscriptions.getSubscriptions(sessionId);
        await this.repo.update(accountId, {
            default_subscriptions: JSON.stringify(current),
        });
        return current;
    }
    async markDisconnected(accountId, reason) {
        const row = await this.repo.findById(accountId);
        if (!row)
            return;
        await this.repo.update(accountId, {
            session_id: null,
            last_error: reason ?? row.last_error,
        });
    }
    async setLastError(accountId, message) {
        const row = await this.repo.findById(accountId);
        if (!row)
            return;
        await this.repo.update(accountId, { last_error: message });
    }
    // ---- Symbols / Market ----
    async listSymbols(accountId, filters) {
        const sessionId = await this.resolveSessionId(accountId);
        const names = await this.mt5Sdk.market.getSymbolNames(sessionId);
        const search = filters?.search?.trim().toLowerCase();
        const filteredNames = search
            ? names.filter((s) => s.toLowerCase().includes(search))
            : names;
        // 为保证接口响应速度，这里暂时只返回 symbol 名称；如需更多字段，可在后续增加缓存/分页后再查 info
        return filteredNames.map((symbol) => ({ symbol }));
    }
    async resolveSessionId(accountId) {
        const row = await this.repo.findById(accountId);
        if (!row)
            throw new NotFoundError('Account', accountId);
        if (!row.session_id) {
            throw new ConflictError(`Account #${accountId} is not connected. Call POST /accounts/${accountId}/connect first.`);
        }
        return row.session_id;
    }
    validateConnectionFields(type, input) {
        if (type === 'address') {
            if (!input.host || !input.port) {
                throw new ValidationError('address connection requires host and port');
            }
        }
        else {
            if (!input.serverName) {
                throw new ValidationError('server connection requires serverName');
            }
        }
    }
    normalizeAccountWriteError(err) {
        if (!(err instanceof Error)) {
            return new ServiceUnavailableError('Failed to persist account');
        }
        if (/UNIQUE constraint failed: mt5_accounts\.login, mt5_accounts\.server_name/i.test(err.message)) {
            return new ConflictError('Account with the same login and server name already exists');
        }
        if (/UNIQUE constraint failed: mt5_accounts\.login, mt5_accounts\.host, mt5_accounts\.port/i.test(err.message)) {
            return new ConflictError('Account with the same login and host/port already exists');
        }
        return err;
    }
}
function toDto(row) {
    return {
        id: row.id,
        login: row.login,
        connectionType: row.connection_type,
        host: row.host,
        port: row.port,
        serverName: row.server_name,
        timeoutMs: row.timeout_ms,
        label: row.label,
        isEnabled: row.is_enabled === 1,
        autoReconnectEnabled: row.auto_reconnect_enabled === 1,
        reconnectDelayMs: row.reconnect_delay_ms,
        maxReconnectAttempts: row.max_reconnect_attempts,
        sessionId: row.session_id,
        lastConnectedAt: row.last_connected_at,
        lastError: row.last_error,
        defaultSubscriptions: (() => {
            if (!row.default_subscriptions)
                return null;
            try {
                const parsed = JSON.parse(row.default_subscriptions);
                if (!Array.isArray(parsed))
                    return null;
                const cleaned = parsed
                    .map((s) => (typeof s === 'string' ? s.trim() : ''))
                    .filter((s) => s.length > 0);
                return cleaned.length > 0 ? cleaned : [];
            }
            catch {
                return null;
            }
        })(),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=account.service.js.map