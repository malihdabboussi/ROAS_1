"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResilientFetch = createResilientFetch;
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524]);
const RETRYABLE_CODES = new Set([
    'ENOTFOUND',
    'ECONNRESET',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
    'ECONNREFUSED',
    'EPIPE',
]);
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isAbortError(error) {
    return !!error && typeof error === 'object' && 'name' in error && error.name === 'AbortError';
}
function getErrorCode(error) {
    if (!error || typeof error !== 'object')
        return null;
    const maybeCode = error.code;
    if (typeof maybeCode === 'string')
        return maybeCode;
    const causeCode = error.cause?.code;
    return typeof causeCode === 'string' ? causeCode : null;
}
function createResilientFetch(options) {
    const { label, maxRetries = 2, timeoutMs = 7000, baseDelayMs = 200, maxDelayMs = 2000 } = options;
    return async (input, init) => {
        let attempt = 0;
        while (true) {
            const timeoutController = new AbortController();
            const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
            try {
                const signal = init?.signal
                    ? AbortSignal.any([init.signal, timeoutController.signal])
                    : timeoutController.signal;
                const response = await fetch(input, { ...(init || {}), signal });
                clearTimeout(timeout);
                const shouldRetry = RETRYABLE_STATUS.has(response.status) && attempt < maxRetries;
                if (!shouldRetry) {
                    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
                    if (!response.ok) {
                        console.warn(`[supabase_fetch] label=${label} url=${url} final_status attempt=${attempt + 1} status=${response.status}`);
                    }
                    return response;
                }
                const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
                const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
                const jitter = Math.floor(Math.random() * 100);
                console.debug(`[supabase_fetch] label=${label} url=${url} attempt=${attempt + 1} retry_status=${response.status}`);
                await sleep(backoff + jitter);
                attempt += 1;
            }
            catch (error) {
                clearTimeout(timeout);
                const code = getErrorCode(error);
                const retryable = (code !== null && RETRYABLE_CODES.has(code)) || isAbortError(error);
                const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
                if (!retryable || attempt >= maxRetries) {
                    const msg = error instanceof Error ? error.message : String(error);
                    console.warn(`[supabase_fetch] label=${label} url=${url} final_failure attempt=${attempt + 1} error=${msg} code=${code || 'none'}`);
                    throw error;
                }
                const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
                const jitter = Math.floor(Math.random() * 100);
                console.debug(`[supabase_fetch] label=${label} url=${url} attempt=${attempt + 1} retry_error=${code || 'abort'}`);
                await sleep(backoff + jitter);
                attempt += 1;
            }
        }
    };
}
//# sourceMappingURL=supabase-resilient-fetch.js.map