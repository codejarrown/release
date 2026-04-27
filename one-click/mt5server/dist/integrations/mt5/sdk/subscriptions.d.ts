import type { HttpClient } from '../../../lib/http-client.js';
import type { SubscribeRequest, SubscribeMultipleRequest } from './types.js';
interface SubscribeResponse {
    subscribed: boolean;
    symbol: string;
}
interface SubscribeMultipleResponse {
    subscribed: boolean;
    symbols: string[];
}
interface UnsubscribeResponse {
    unsubscribed: boolean;
    symbol: string;
}
interface UnsubscribeMultipleResponse {
    unsubscribed: boolean;
    symbols: string[];
}
export declare class SubscriptionsApi {
    private readonly client;
    private readonly sessionId?;
    constructor(client: HttpClient, sessionId?: string | undefined);
    private sid;
    subscribe(body: SubscribeRequest, sessionId?: string): Promise<SubscribeResponse>;
    subscribeMultiple(body: SubscribeMultipleRequest, sessionId?: string): Promise<SubscribeMultipleResponse>;
    subscribeForce(body: SubscribeMultipleRequest, sessionId?: string): Promise<SubscribeMultipleResponse>;
    unsubscribe(body: SubscribeRequest, sessionId?: string): Promise<UnsubscribeResponse>;
    unsubscribeMultiple(body: SubscribeMultipleRequest, sessionId?: string): Promise<UnsubscribeMultipleResponse>;
    getSubscriptions(sessionId?: string): Promise<string[]>;
    isSubscribed(symbol: string, sessionId?: string): Promise<boolean>;
    subscribeOrderBook(body: SubscribeRequest, sessionId?: string): Promise<SubscribeResponse>;
    unsubscribeOrderBook(body: SubscribeRequest, sessionId?: string): Promise<UnsubscribeResponse>;
}
export {};
//# sourceMappingURL=subscriptions.d.ts.map