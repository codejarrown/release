import type { HttpClient } from '../../../lib/http-client.js';
import type { OrderSendRequest, OrderCloseRequest, OrderModifyRequest, Order, OrderSort, SuccessResponse } from './types.js';
export declare class TradingApi {
    private readonly client;
    private readonly sessionId?;
    constructor(client: HttpClient, sessionId?: string | undefined);
    private sid;
    orderSend(body: OrderSendRequest, sessionId?: string): Promise<Order>;
    orderClose(body: OrderCloseRequest, sessionId?: string): Promise<Order>;
    orderModify(body: OrderModifyRequest, sessionId?: string): Promise<SuccessResponse>;
    getOpenedOrders(opts?: {
        sort?: OrderSort;
        ascending?: boolean;
        sessionId?: string;
    }): Promise<Order[]>;
    getOpenedOrder(ticket: number, sessionId?: string): Promise<Order>;
    getClosedOrders(sessionId?: string): Promise<Order[]>;
}
//# sourceMappingURL=trading.d.ts.map