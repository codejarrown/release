import type { HttpClient } from '../../../lib/http-client.js';
export interface HealthCheckResponse {
    status: string;
    timestamp: string;
}
export declare class HealthApi {
    private readonly client;
    constructor(client: HttpClient);
    check(): Promise<HealthCheckResponse>;
}
//# sourceMappingURL=health.d.ts.map