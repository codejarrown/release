import type { HttpClient } from '../../../lib/http-client.js';
import type { RequiredMarginRequest, CalculateOrderProfitRequest } from './types.js';
export declare class CalculationsApi {
    private readonly client;
    private readonly sessionId?;
    constructor(client: HttpClient, sessionId?: string | undefined);
    private sid;
    calcRequiredMargin(body: RequiredMarginRequest, sessionId?: string): Promise<number>;
    calcOrderProfit(body: CalculateOrderProfitRequest, sessionId?: string): Promise<number>;
    updateProfits(sessionId?: string): Promise<{
        accountProfit: number;
        accountMargin: number;
        accountEquity: number;
    }>;
}
//# sourceMappingURL=calculations.d.ts.map