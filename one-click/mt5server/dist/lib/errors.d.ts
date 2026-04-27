export declare class HttpClientError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: unknown | undefined;
    constructor(message: string, statusCode: number, code: string, details?: unknown | undefined);
    get isClientError(): boolean;
    get isServerError(): boolean;
    get isRetryable(): boolean;
}
export declare class TimeoutError extends Error {
    readonly url: string;
    readonly timeoutMs: number;
    constructor(url: string, timeoutMs: number);
}
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: unknown | undefined;
    constructor(message: string, statusCode: number, code: string, details?: unknown | undefined);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id?: string | number);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map