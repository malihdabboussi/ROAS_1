"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const gemini_api_keys_1 = require("./gemini-api-keys");
(0, vitest_1.describe)('resolveGeminiApiKeys', () => {
    (0, vitest_1.it)('returns primary only when fallback is unset', () => {
        (0, vitest_1.expect)((0, gemini_api_keys_1.resolveGeminiApiKeys)((key) => (key === 'GEMINI_API_KEY' ? ' primary-key ' : undefined))).toEqual(['primary-key']);
    });
    (0, vitest_1.it)('returns primary then fallback when both are set', () => {
        const env = {
            GEMINI_API_KEY: 'key-3',
            GEMINI_API_KEY_FALLBACK: 'key-2',
            GEMINI_API_KEY_FALLBACK_2: 'key-1',
        };
        (0, vitest_1.expect)((0, gemini_api_keys_1.resolveGeminiApiKeys)((key) => env[key])).toEqual(['key-3', 'key-2', 'key-1']);
    });
    (0, vitest_1.it)('dedupes duplicate keys across env vars', () => {
        const env = {
            GEMINI_API_KEY: 'same-key',
            GEMINI_API_KEY_FALLBACK: 'same-key',
            GEMINI_API_KEY_FALLBACK_2: 'other-key',
        };
        (0, vitest_1.expect)((0, gemini_api_keys_1.resolveGeminiApiKeys)((key) => env[key])).toEqual(['same-key', 'other-key']);
    });
});
(0, vitest_1.describe)('shouldTryNextGeminiApiKey', () => {
    (0, vitest_1.it)('returns true for auth and permission errors', () => {
        (0, vitest_1.expect)((0, gemini_api_keys_1.shouldTryNextGeminiApiKey)(401)).toBe(true);
        (0, vitest_1.expect)((0, gemini_api_keys_1.shouldTryNextGeminiApiKey)(403)).toBe(true);
    });
    (0, vitest_1.it)('returns false for rate limits and server errors', () => {
        (0, vitest_1.expect)((0, gemini_api_keys_1.shouldTryNextGeminiApiKey)(429)).toBe(false);
        (0, vitest_1.expect)((0, gemini_api_keys_1.shouldTryNextGeminiApiKey)(500)).toBe(false);
    });
});
//# sourceMappingURL=gemini-api-keys.test.js.map