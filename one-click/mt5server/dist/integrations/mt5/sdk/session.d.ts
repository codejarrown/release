import type { HttpClient } from '../../../lib/http-client.js';
import type { ConnectByAddressRequest, ConnectByServerRequest, ConnectResponse, SessionInfoResponse, SessionPingResponse, SessionListResponse, ChangePasswordRequest, SuccessResponse } from './types.js';
export declare class SessionApi {
    private readonly client;
    constructor(client: HttpClient);
    connectByAddress(body: ConnectByAddressRequest): Promise<ConnectResponse>;
    connectByServer(body: ConnectByServerRequest): Promise<ConnectResponse>;
    list(): Promise<SessionListResponse>;
    get(sessionId: string): Promise<SessionInfoResponse>;
    ping(sessionId: string): Promise<SessionPingResponse>;
    disconnect(sessionId: string): Promise<{
        success: boolean;
    }>;
    changePassword(sessionId: string, body: ChangePasswordRequest): Promise<SuccessResponse>;
}
//# sourceMappingURL=session.d.ts.map