import type { HttpClient } from '../../../lib/http-client.js';
import type { MailMessage, SuccessResponse } from './types.js';
export declare class MailApi {
    private readonly client;
    private readonly sessionId?;
    constructor(client: HttpClient, sessionId?: string | undefined);
    private sid;
    getMails(sessionId?: string): Promise<MailMessage[]>;
    requestMailBody(mailId: number, sessionId?: string): Promise<SuccessResponse>;
}
//# sourceMappingURL=mail.d.ts.map