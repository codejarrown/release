export class WebhookSender {
    platform = 'webhook';
    async send(message, config) {
        const url = config.url;
        if (!url) {
            throw new Error('Webhook config requires url');
        }
        const headers = {
            'Content-Type': 'application/json',
        };
        if (config.secret) {
            headers['X-Webhook-Secret'] = config.secret;
        }
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: message.title,
                body: message.body,
                level: message.level ?? 'info',
                metadata: message.metadata,
                timestamp: new Date().toISOString(),
            }),
        });
        if (!res.ok) {
            throw new Error(`Webhook error (${res.status}): ${await res.text()}`);
        }
    }
}
//# sourceMappingURL=webhook.js.map