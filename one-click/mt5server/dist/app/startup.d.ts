import type { Mt5ApiSdk } from '../integrations/mt5/sdk/index.js';
import type { Mt5AccountRepository } from '../db/repositories/mt5-account.repository.js';
import type { PushService } from '../services/push/index.js';
import type { WsConnectionManager } from '../services/ws-manager.js';
import type { AccountService } from '../services/account.service.js';
interface Deps {
    mt5Sdk: Mt5ApiSdk;
    accountRepo: Mt5AccountRepository;
    accountService: AccountService;
    pushService: PushService;
    wsManager: WsConnectionManager;
}
/**
 * Synchronize MT5 sessions and local account state on application startup.
 *
 * - Fetch current online sessions from MT5 (`session.list`)
 * - For each enabled account:
 *   - If local session_id is missing or not online, try to connect once
 *   - If session_id is still online, register it into the WsConnectionManager
 */
export declare function initializeAccountSessionsOnStartup({ mt5Sdk, accountRepo, accountService, pushService, wsManager, }: Deps): Promise<void>;
export {};
//# sourceMappingURL=startup.d.ts.map