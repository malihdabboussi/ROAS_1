"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
function defaultDelayMsAfterFailure(failedAttemptNumber) {
    return Math.min(1000 * 2 ** (failedAttemptNumber - 1), 10_000);
}
function defaultRetryCondition(error) {
    const e = error;
    if (e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT')
        return true;
    if (e.name === 'TypeError' && typeof e.message === 'string' && e.message.includes('fetch'))
        return true;
    if (typeof e.status === 'number' && e.status >= 500 && e.status < 600)
        return true;
    if (e.status === 429)
        return true;
    return false;
}
async function withRetry(operation, options = {}) {
    const maxAttempts = options.maxAttempts ?? 3;
    const delayMsAfterFailure = options.delayMsAfterFailure ?? defaultDelayMsAfterFailure;
    const retryCondition = options.retryCondition ?? defaultRetryCondition;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts || !retryCondition(error)) {
                break;
            }
            const delay = delayMsAfterFailure(attempt);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    if (lastError instanceof Error) {
        throw lastError;
    }
    throw new Error(String(lastError ?? 'withRetry: unknown error'));
}
//# sourceMappingURL=with-retry.js.map