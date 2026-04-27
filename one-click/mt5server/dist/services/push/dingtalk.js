export class DingTalkSender {
    platform = 'dingtalk';
    async send(message, config) {
        const webhookUrl = config.webhookUrl;
        if (!webhookUrl) {
            throw new Error('DingTalk config requires webhookUrl');
        }
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                msgtype: 'markdown',
                markdown: {
                    title: message.title,
                    text: `### ${message.title}\n\n${message.body}`,
                },
            }),
        });
        if (!res.ok) {
            throw new Error(`DingTalk API error (${res.status}): ${await res.text()}`);
        }
    }
}
//# sourceMappingURL=dingtalk.js.map