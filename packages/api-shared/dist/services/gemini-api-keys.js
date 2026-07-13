"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_API_KEY_FALLBACK_ENV_KEYS = void 0;
exports.resolveGeminiApiKeys = resolveGeminiApiKeys;
exports.shouldTryNextGeminiApiKey = shouldTryNextGeminiApiKey;
exports.GEMINI_API_KEY_FALLBACK_ENV_KEYS = [
    'GEMINI_API_KEY_FALLBACK',
    'GEMINI_API_KEY_FALLBACK_2',
];
function resolveGeminiApiKeys(read) {
    const keys = [];
    const seen = new Set();
    const add = (value) => {
        const trimmed = value?.trim();
        if (!trimmed || seen.has(trimmed))
            return;
        keys.push(trimmed);
        seen.add(trimmed);
    };
    add(read('GEMINI_API_KEY'));
    for (const envKey of exports.GEMINI_API_KEY_FALLBACK_ENV_KEYS) {
        add(read(envKey));
    }
    return keys;
}
function shouldTryNextGeminiApiKey(status) {
    return status === 401 || status === 403;
}
//# sourceMappingURL=gemini-api-keys.js.map