import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const QUICK_RECONNECT_LOG_PATH = process.env.MT5_QUICK_RECONNECT_LOG_PATH?.trim()
    || resolve(process.cwd(), 'var/logs/mt5-reconnect-debug.log');
export function writeQuickReconnectLog(event, payload) {
    const line = `${JSON.stringify({
        time: new Date().toISOString(),
        event,
        ...payload,
    })}\n`;
    void mkdir(dirname(QUICK_RECONNECT_LOG_PATH), { recursive: true })
        .then(() => appendFile(QUICK_RECONNECT_LOG_PATH, line, 'utf8'))
        .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`[quick-reconnect-log] write failed: ${message}\n`);
    });
}
export function getQuickReconnectLogPath() {
    return QUICK_RECONNECT_LOG_PATH;
}
//# sourceMappingURL=quick-reconnect-log.js.map