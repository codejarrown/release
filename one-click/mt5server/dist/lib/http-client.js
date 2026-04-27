import { HttpClientError, TimeoutError } from './errors.js';
const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY = 1_000;
function buildUrl(base, path, query) {
    const url = new URL(path, base);
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        }
    }
    return url.toString();
}
function flattenHeaders(headers) {
    const result = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export class HttpClient {
    baseUrl;
    timeout;
    retries;
    retryDelay;
    defaultHeaders;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, '');
        this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
        this.retries = options.retries ?? DEFAULT_RETRIES;
        this.retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...options.headers,
        };
    }
    async get(path, query) {
        return this.request('GET', path, undefined, query);
    }
    async post(path, body, query) {
        return this.request('POST', path, body, query);
    }
    async put(path, body, query) {
        return this.request('PUT', path, body, query);
    }
    async delete(path, query) {
        return this.request('DELETE', path, undefined, query);
    }
    async request(method, path, body, query) {
        const url = buildUrl(this.baseUrl, path, query);
        let lastError;
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                return await this.executeRequest(method, url, body);
            }
            catch (err) {
                lastError = err;
                const shouldRetry = attempt < this.retries &&
                    method === 'GET' &&
                    (err instanceof TimeoutError ||
                        (err instanceof HttpClientError && err.isRetryable));
                if (shouldRetry) {
                    const delay = this.retryDelay * Math.pow(2, attempt);
                    await sleep(delay);
                    continue;
                }
                throw err;
            }
        }
        throw lastError;
    }
    async executeRequest(method, url, body) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);
        try {
            const res = await fetch(url, {
                method,
                headers: { ...this.defaultHeaders },
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            const responseHeaders = flattenHeaders(res.headers);
            const contentType = responseHeaders['content-type'] ?? '';
            let responseBody;
            if (contentType.includes('application/json')) {
                responseBody = (await res.json());
            }
            else {
                responseBody = (await res.text());
            }
            if (!res.ok) {
                const errBody = responseBody;
                throw new HttpClientError(errBody?.message ?? `HTTP ${res.status} ${res.statusText}`, res.status, errBody?.error ?? 'http_error', errBody);
            }
            return { statusCode: res.status, headers: responseHeaders, body: responseBody };
        }
        catch (err) {
            if (err instanceof HttpClientError)
                throw err;
            if (err instanceof DOMException && err.name === 'AbortError') {
                throw new TimeoutError(url, this.timeout);
            }
            throw err;
        }
        finally {
            clearTimeout(timer);
        }
    }
}
//# sourceMappingURL=http-client.js.map