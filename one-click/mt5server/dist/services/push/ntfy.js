const DEFAULT_SERVER_URL = 'https://ntfy.sh';
const PRIORITY_NAME = {
    info: 'default',
    warn: 'high',
    error: 'urgent',
};
export class NtfySender {
    platform = 'ntfy';
    async send(message, config) {
        const topic = normalizeString(config.topic);
        if (!topic) {
            throw new Error('ntfy config requires topic');
        }
        const serverUrl = normalizeBaseUrl(config.serverUrl) ?? DEFAULT_SERVER_URL;
        const token = normalizeString(config.token);
        const tags = normalizeTags(message.level);
        const priorityName = PRIORITY_NAME[message.level ?? 'info'] ?? PRIORITY_NAME.info;
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
        throw new Error(`ntfy error (${res.status}): ${await res.text()}`);
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
function normalizeTags(level) {
    switch (level) {
        case 'error':
            return 'rotating_light,warning';
        case 'warn':
            return 'warning';
        default:
            return 'information_source';
    }
}
//# sourceMappingURL=ntfy.js.map