import type { HttpClient } from '../../../lib/http-client.js';
import type { Quote, MarketWatch, SymbolInfo, SymGroup, ClusterDetails } from './types.js';
export declare class MarketApi {
    private readonly client;
    private readonly sessionId?;
    constructor(client: HttpClient, sessionId?: string | undefined);
    private sid;
    getQuote(symbol: string, opts?: {
        timeoutMs?: number;
        sessionId?: string;
    }): Promise<Quote>;
    getQuoteSync(symbol: string, opts?: {
        timeoutMs?: number;
        msNotOlder?: number;
        sessionId?: string;
    }): Promise<Quote>;
    getMarketWatch(symbol: string, sessionId?: string): Promise<MarketWatch>;
    getSymbolNames(sessionId?: string): Promise<string[]>;
    getSymbolInfo(symbol: string, sessionId?: string): Promise<SymbolInfo>;
    getSymbolGroup(symbol: string, sessionId?: string): Promise<SymGroup>;
    symbolExists(symbol: string, sessionId?: string): Promise<boolean>;
    getContractSize(symbol: string, sessionId?: string): Promise<number>;
    getTickSize(symbol: string, sessionId?: string): Promise<number>;
    getTickValue(symbol: string, opts?: {
        timeoutMs?: number;
        sessionId?: string;
    }): Promise<number>;
    isQuoteSession(symbol: string, sessionId?: string): Promise<boolean>;
    isTradeSession(symbol: string, sessionId?: string): Promise<boolean>;
    getServerTime(sessionId?: string): Promise<{
        serverTime: string;
        timeZoneMinutes?: number;
    }>;
    getClusterDetails(sessionId?: string): Promise<ClusterDetails>;
}
//# sourceMappingURL=market.d.ts.map