import type { HttpClient } from '../../../lib/http-client.js';
import type { DownloadOrderHistoryRequest, DownloadPendingOrderHistoryRequest, RequestOrderHistoryRequest, DownloadQuoteHistoryRequest, DownloadQuoteHistoryMonthRequest, DownloadQuoteHistoryTodayRequest, TickHistoryRequest, OrderHistoryEventArgs, OrderInternal, Bar, SubscribeRequest, SuccessResponse } from './types.js';
export declare class HistoryApi {
    private readonly client;
    private readonly sessionId?;
    constructor(client: HttpClient, sessionId?: string | undefined);
    private sid;
    downloadOrderHistory(body: DownloadOrderHistoryRequest, sessionId?: string): Promise<OrderHistoryEventArgs>;
    downloadOrderHistorySync(body: DownloadOrderHistoryRequest, sessionId?: string): Promise<OrderHistoryEventArgs>;
    downloadPendingOrderHistory(body: DownloadPendingOrderHistoryRequest, sessionId?: string): Promise<OrderInternal[]>;
    requestOrderHistory(body: RequestOrderHistoryRequest, sessionId?: string): Promise<SuccessResponse>;
    requestPendingOrderHistory(body: RequestOrderHistoryRequest, sessionId?: string): Promise<SuccessResponse>;
    downloadQuoteHistory(body: DownloadQuoteHistoryRequest, sessionId?: string): Promise<Bar[]>;
    downloadQuoteHistoryAsync(body: DownloadQuoteHistoryRequest, sessionId?: string): Promise<Bar[]>;
    downloadQuoteHistoryMonth(body: DownloadQuoteHistoryMonthRequest, sessionId?: string): Promise<Bar[]>;
    downloadQuoteHistoryMonthAsync(body: DownloadQuoteHistoryMonthRequest, sessionId?: string): Promise<Bar[]>;
    downloadQuoteHistoryToday(body: DownloadQuoteHistoryTodayRequest, sessionId?: string): Promise<Bar[]>;
    downloadQuoteHistoryTodayAsync(body: DownloadQuoteHistoryTodayRequest, sessionId?: string): Promise<Bar[]>;
    requestQuoteHistoryMonth(body: DownloadQuoteHistoryMonthRequest, sessionId?: string): Promise<SuccessResponse>;
    requestQuoteHistoryToday(body: SubscribeRequest, sessionId?: string): Promise<SuccessResponse>;
    requestTickHistory(body: TickHistoryRequest, sessionId?: string): Promise<SuccessResponse>;
    stopTickHistory(body: SubscribeRequest, sessionId?: string): Promise<SuccessResponse>;
}
//# sourceMappingURL=history.d.ts.map