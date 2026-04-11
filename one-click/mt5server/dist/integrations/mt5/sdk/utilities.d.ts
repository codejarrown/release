import type { HttpClient } from '../../../lib/http-client.js';
import type { PingRequest, Server, RequestDemoAccountRequest, DemoAccountResponse } from './types.js';
export declare class UtilitiesApi {
    private readonly client;
    constructor(client: HttpClient);
    ping(body: PingRequest): Promise<{
        latencyMs: number;
    }>;
    loadDefaultServersDat(): Promise<Server[]>;
    loadServersDat(path: string): Promise<Server[]>;
    saveServersDat(servers: Server[]): Promise<ArrayBuffer | string>;
    requestDemoAccount(body: RequestDemoAccountRequest): Promise<DemoAccountResponse>;
}
//# sourceMappingURL=utilities.d.ts.map