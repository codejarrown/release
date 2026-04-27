import type { IMt5AccountRepository, AccountListFilter } from '../db/repositories/mt5-account.repository.js';
import type { ConnectionType } from '../db/kysely/database.js';
import type { Mt5ApiSdk } from '../integrations/mt5/sdk/index.js';
export interface AccountDto {
    id: number;
    login: number;
    connectionType: ConnectionType;
    host: string | null;
    port: number | null;
    serverName: string | null;
    timeoutMs: number;
    label: string | null;
    isEnabled: boolean;
    autoReconnectEnabled: boolean;
    reconnectDelayMs: number;
    maxReconnectAttempts: number;
    sessionId: string | null;
    lastConnectedAt: string | null;
    lastError: string | null;
    defaultSubscriptions: string[] | null;
    createdAt: string;
    updatedAt: string;
}
export interface SymbolSummaryDto {
    symbol: string;
    description?: string;
    digits?: number;
    contractSize?: number;
    currency?: string;
    tickSize?: number;
}
export interface AccountPingDto {
    latencyMs: number;
    host: string;
    port: number;
}
export interface AccountInfoDto {
    accountId: number;
    sessionId: string;
    login: number;
    userName: string;
    balance: number;
    profit: number | null;
    equity: number | null;
    margin: number | null;
    freeMargin: number | null;
    marginLevel: number | null;
    credit: number | null;
    leverage: number | null;
    country: string | null;
    email: string | null;
    accountCurrency: string | null;
}
export interface CreateAccountInput {
    login: number;
    password: string;
    connectionType: ConnectionType;
    host?: string;
    port?: number;
    serverName?: string;
    timeoutMs?: number;
    label?: string;
    autoReconnectEnabled?: boolean;
    reconnectDelayMs?: number;
    maxReconnectAttempts?: number;
}
export interface UpdateAccountInput {
    login?: number;
    connectionType?: ConnectionType;
    password?: string;
    host?: string;
    port?: number;
    serverName?: string;
    timeoutMs?: number;
    label?: string | null;
    isEnabled?: boolean;
    autoReconnectEnabled?: boolean;
    reconnectDelayMs?: number;
    maxReconnectAttempts?: number;
}
export interface AccountLifecycleHooks {
    onConnect?: (accountId: number, sessionId: string) => void;
    onDisconnect?: (accountId: number) => void;
}
export declare class AccountService {
    private readonly repo;
    private readonly mt5Sdk;
    private readonly encryptionKey;
    private hooks;
    constructor(repo: IMt5AccountRepository, mt5Sdk: Mt5ApiSdk, encryptionKey: string);
    setHooks(hooks: AccountLifecycleHooks): void;
    list(filter?: AccountListFilter): Promise<AccountDto[]>;
    getById(id: number): Promise<AccountDto>;
    create(input: CreateAccountInput): Promise<AccountDto>;
    update(id: number, input: UpdateAccountInput): Promise<AccountDto>;
    delete(id: number): Promise<void>;
    connect(id: number): Promise<{
        sessionId: string;
    }>;
    disconnect(id: number): Promise<void>;
    listSubscriptions(accountId: number): Promise<string[]>;
    getPing(accountId: number): Promise<AccountPingDto>;
    getAccountInfo(accountId: number): Promise<AccountInfoDto>;
    listConnectedAccountInfos(): Promise<AccountInfoDto[]>;
    addSubscriptions(accountId: number, symbols: string[]): Promise<string[]>;
    removeSubscriptions(accountId: number, symbols: string[]): Promise<string[]>;
    resetSubscriptions(accountId: number): Promise<string[]>;
    subscribeSymbol(accountId: number, symbol: string, opts?: {
        force?: boolean;
    }): Promise<string[]>;
    unsubscribeSymbol(accountId: number, symbol: string): Promise<string[]>;
    markDisconnected(accountId: number, reason?: string): Promise<void>;
    setLastError(accountId: number, message: string): Promise<void>;
    listSymbols(accountId: number, filters?: {
        search?: string;
    }): Promise<SymbolSummaryDto[]>;
    resolveSessionId(accountId: number): Promise<string>;
    private validateConnectionFields;
    private normalizeAccountWriteError;
}
//# sourceMappingURL=account.service.d.ts.map