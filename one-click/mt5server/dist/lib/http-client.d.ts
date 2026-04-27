export interface HttpClientOptions {
    baseUrl: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    headers?: Record<string, string>;
}
export interface HttpResponse<T = unknown> {
    statusCode: number;
    headers: Record<string, string>;
    body: T;
}
type QueryParams = Record<string, string | number | boolean | undefined | null>;
export declare class HttpClient {
    private readonly baseUrl;
    private readonly timeout;
    private readonly retries;
    private readonly retryDelay;
    private readonly defaultHeaders;
    constructor(options: HttpClientOptions);
    get<T = unknown>(path: string, query?: QueryParams): Promise<HttpResponse<T>>;
    post<T = unknown>(path: string, body?: unknown, query?: QueryParams): Promise<HttpResponse<T>>;
    put<T = unknown>(path: string, body?: unknown, query?: QueryParams): Promise<HttpResponse<T>>;
    delete<T = unknown>(path: string, query?: QueryParams): Promise<HttpResponse<T>>;
    private request;
    private executeRequest;
}
export {};
//# sourceMappingURL=http-client.d.ts.map