export class MailApi {
    client;
    sessionId;
    constructor(client, sessionId) {
        this.client = client;
        this.sessionId = sessionId;
    }
    sid(sessionId) {
        const id = sessionId ?? this.sessionId;
        if (!id)
            throw new Error('sessionId is required');
        return id;
    }
    async getMails(sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.get(`/api/${sid}/mail/`);
        return res.body;
    }
    async requestMailBody(mailId, sessionId) {
        const sid = this.sid(sessionId);
        const res = await this.client.post(`/api/${sid}/mail/${mailId}/body`);
        return res.body;
    }
}
//# sourceMappingURL=mail.js.map