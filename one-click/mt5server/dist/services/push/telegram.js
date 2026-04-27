const EMOJI = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '🚨',
};
export class TelegramSender {
    platform = 'telegram';
    async send(message, config) {
        const botToken = config.botToken;
        const chatId = config.chatId;
        if (!botToken || !chatId) {
            throw new Error('Telegram config requires botToken and chatId');
        }
        const emoji = EMOJI[message.level ?? 'info'] ?? '';
        const text = `${emoji} *${escapeMarkdown(message.title)}*\n\n${escapeMarkdown(message.body)}`;
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'MarkdownV2',
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Telegram API error (${res.status}): ${body}`);
        }
    }
}
function escapeMarkdown(text) {
    // Escape special characters for Telegram MarkdownV2
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
//# sourceMappingURL=telegram.js.map