export class HttpClientError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'HttpClientError';
    }
    get isClientError() {
        return this.statusCode >= 400 && this.statusCode < 500;
    }
    get isServerError() {
        return this.statusCode >= 500;
    }
    get isRetryable() {
        return this.statusCode === 408 || this.statusCode === 429 || this.statusCode >= 500;
    }
}
export class TimeoutError extends Error {
    url;
    timeoutMs;
    constructor(url, timeoutMs) {
        super(`Request to ${url} timed out after ${timeoutMs}ms`);
        this.url = url;
        this.timeoutMs = timeoutMs;
        this.name = 'TimeoutError';
    }
}
export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
export class NotFoundError extends AppError {
    constructor(resource, id) {
        super(id ? `${resource} #${id} not found` : `${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
export class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}
export class ServiceUnavailableError extends AppError {
    constructor(message) {
        super(message, 503, 'SERVICE_UNAVAILABLE');
        this.name = 'ServiceUnavailableError';
    }
}
//# sourceMappingURL=errors.js.map