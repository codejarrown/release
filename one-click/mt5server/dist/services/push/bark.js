const DEFAULT_SERVER_URL = 'https://api.day.app';
const DEFAULT_LEVEL = 'critical';
const DEFAULT_CALL = '1';
export class BarkSender {
    platform = 'bark';
    async send(message, config) {
        const deviceKey = normalizeString(config.deviceKey);
        if (!deviceKey) {
            throw new Error('Bark config requires deviceKey');
        }
        const serverUrl = normalizeBaseUrl(config.serverUrl) ?? DEFAULT_SERVER_URL;
        const query = new URLSearchParams();
        const level = normalizeString(config.level) ?? mapLevel(message.level) ?? DEFAULT_LEVEL;
        const call = normalizeCall(config.call) ?? DEFAULT_CALL;
        const group = normalizeString(config.group);
        const sound = normalizeString(config.sound);
        const icon = normalizeString(config.icon);
        const url = normalizeString(config.url);
        const volume = normalizeNumber(config.volume);
        const badge = normalizeNumber(config.badge);
        const autoCopy = normalizeCall(config.autoCopy);
        const copy = normalizeString(config.copy);
        const isArchive = normalizeCall(config.isArchive);
        if (group)
            query.set('group', group);
        if (sound)
            query.set('sound', sound);
        if (icon)
            query.set('icon', icon);
        if (url)
            query.set('url', url);
        if (volume !== null)
            query.set('volume', String(volume));
        if (badge !== null)
            query.set('badge', String(badge));
        if (autoCopy)
            query.set('autoCopy', autoCopy);
        if (copy)
            query.set('copy', copy);
        if (isArchive)
            query.set('isArchive', isArchive);
        query.set('call', call);
        query.set('level', level);
        const endpoint = `${serverUrl}/${encodeURIComponent(deviceKey)}/${encodeURIComponent(message.title)}/${encodeURIComponent(buildBody(message))}`;
        const res = await fetch(`${endpoint}?${query.toString()}`, {
            method: 'GET',
        });
        if (!res.ok) {
            throw new Error(`Bark API error (${res.status}): ${await res.text()}`);
        }
    }
}
function buildBody(message) {
    const lines = [message.body];
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
function normalizeCall(value) {
    if (value === 1 || value === '1' || value === true || value === 'true')
        return '1';
    if (value === 0 || value === '0' || value === false || value === 'false')
        return '0';
    return null;
}
function normalizeNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function mapLevel(level) {
    switch (level) {
        case 'error':
            return 'critical';
        case 'warn':
            return 'timeSensitive';
        case 'info':
            return 'active';
        default:
            return null;
    }
}
//# sourceMappingURL=bark.js.map