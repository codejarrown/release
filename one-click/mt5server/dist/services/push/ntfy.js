const DEFAULT_SERVER_URL = 'https://ntfy.sh';
const NTFY_DAILY_QUOTA_ERROR_CODE = 42908;
const PRIORITY_NAME = {
    info: 'default',
    warn: 'high',
    error: 'urgent',
};
export class NtfyQuotaExceededError extends Error {
    statusCode;
    errorCode;
    constructor(message, statusCode, errorCode) {
        super(message);
        this.name = 'NtfyQuotaExceededError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}
export class NtfySender {
    platform = 'ntfy';
    async send(message, config) {
        const topic = normalizeString(config.topic);
        if (!topic) {
            throw new Error('ntfy config requires topic');
        }
        const serverUrl = normalizeBaseUrl(config.serverUrl) ?? DEFAULT_SERVER_URL;
        const token = normalizeString(config.token);
        const tags = normalizeTags(message);
        const priorityName = resolvePriorityName(message);
        const headers = {
            'Content-Type': 'text/plain; charset=utf-8',
            Priority: priorityName,
            Tags: tags,
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        await sendOnce(serverUrl, topic, headers, buildBody(message));
    }
}
async function sendOnce(serverUrl, topic, headers, body) {
    const res = await fetch(`${serverUrl}/${encodeURIComponent(topic)}`, {
        method: 'POST',
        headers,
        body,
    });
    if (!res.ok) {
        const responseText = await res.text();
        const parsed = tryParseJson(responseText);
        const errorCode = parsed && typeof parsed === 'object' && typeof parsed.code === 'number'
            ? parsed.code
            : null;
        if (res.status === 429 && errorCode === NTFY_DAILY_QUOTA_ERROR_CODE) {
            throw new NtfyQuotaExceededError(`ntfy daily quota reached (${res.status}): ${responseText}`, res.status, errorCode);
        }
        throw new Error(`ntfy error (${res.status}): ${responseText}`);
    }
}
function buildBody(message) {
    const lines = [message.title, '', message.body];
    if (message.metadata && Object.keys(message.metadata).length > 0) {
        lines.push('', JSON.stringify(message.metadata, null, 2));
    }
    return lines.join('\n');
}
function normalizeBaseUrl(value) {
    const text = normalizeString(value);
    if (!text)
        return null;
    return text.replace(/\/+$/, '');
}
function normalizeString(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
function resolvePriorityName(message) {
    if (isSpreadSubscriptionAlert(message))
        return 'urgent';
    return PRIORITY_NAME[message.level ?? 'info'] ?? PRIORITY_NAME.info;
}
function normalizeTags(message) {
    if (isSpreadSubscriptionAlert(message)) {
        return 'rotating_light,chart_with_upwards_trend';
    }
    const level = message.level;
    switch (level) {
        case 'error':
            return 'rotating_light,warning';
        case 'warn':
            return 'warning';
        default:
            return 'information_source';
    }
}
function isSpreadSubscriptionAlert(message) {
    return message.metadata?.kind === 'spread-stable-threshold';
}
function tryParseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=ntfy.js.map