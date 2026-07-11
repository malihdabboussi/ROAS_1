"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrySupabaseQuery = retrySupabaseQuery;
const transient_error_util_1 = require("./transient-error.util");
async function retrySupabaseQuery(queryFn, options) {
    const { maxAttempts = 3, baseDelayMs = 150, errorPrefix, logger } = options;
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const { data, error } = await queryFn();
        if (!error)
            return data;
        lastError = error.message;
        if (!(0, transient_error_util_1.isTransientNetworkError)(lastError) || attempt === maxAttempts)
            break;
        logger?.warn(`${errorPrefix} (attempt ${attempt}/${maxAttempts}) transient error: ${lastError}`);
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
    throw new Error(`${errorPrefix}: ${lastError ?? 'unknown error'}`);
}
//# sourceMappingURL=retry-supabase-query.js.map