/**
 * Synchronize MT5 sessions and local account state on application startup.
 *
 * - Fetch current online sessions from MT5 (`session.list`)
 * - For each enabled account:
 *   - If local session_id is missing or not online, try to connect once
 *   - If session_id is still online, register it into the WsConnectionManager
 */
export async function initializeAccountSessionsOnStartup({ mt5Sdk, accountRepo, accountService, pushService, wsManager, }) {
    const sessionList = await mt5Sdk.session.list();
    const activeSessionIds = new Set(sessionList.sessionIds);
    const enabledAccounts = await accountRepo.findAll({ isEnabled: true });
    for (const acc of enabledAccounts) {
        if (!acc.session_id || !activeSessionIds.has(acc.session_id)) {
            try {
                await accountService.connect(acc.id);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                await accountService.setLastError(acc.id, message);
                pushService.broadcast({
                    title: 'Account Startup Connect Failed',
                    body: `Account #${acc.id} failed to connect on startup: ${message}`,
                    level: 'error',
                    metadata: { accountId: acc.id, error: message },
                });
            }
        }
        else {
            wsManager.addSession(acc.id, acc.session_id);
        }
    }
}
//# sourceMappingURL=startup.js.map