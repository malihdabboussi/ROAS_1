"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderOutputValidationError = void 0;
exports.parseOpenRouterImageOutput = parseOpenRouterImageOutput;
exports.summarizeOpenRouterImageResponse = summarizeOpenRouterImageResponse;
const openrouter_metadata_1 = require("./openrouter-metadata");
class ProviderOutputValidationError extends Error {
    attemptId;
    providerGenerationId;
    providerCostUsd;
    providerEffectConfirmed;
    constructor(input) {
        super(input.providerEffectConfirmed
            ? 'The image provider completed and billed this request, but the returned image could not be validated. Do not retry automatically.'
            : 'The image provider response could not be validated. Its billing effect is unknown, so do not retry automatically.');
        this.name = 'ProviderOutputValidationError';
        this.attemptId = input.attemptId;
        this.providerGenerationId = input.providerGenerationId;
        this.providerCostUsd = input.providerCostUsd;
        this.providerEffectConfirmed = input.providerEffectConfirmed;
    }
}
exports.ProviderOutputValidationError = ProviderOutputValidationError;
function parseOpenRouterImageOutput(payload) {
    if (!isRecord(payload))
        return null;
    const data = Array.isArray(payload.data) ? payload.data : [];
    const firstImage = data.find((entry) => isRecord(entry) && typeof entry.b64_json === 'string' && entry.b64_json.length > 0);
    if (!firstImage)
        return null;
    const usage = isRecord(payload.usage) ? payload.usage : {};
    return {
        imageBytesB64: firstImage.b64_json,
        mimeType: typeof firstImage.media_type === 'string' && firstImage.media_type.length > 0
            ? firstImage.media_type
            : 'image/png',
        resolvedModel: typeof payload.model === 'string' ? payload.model : null,
        providerCostUsd: (0, openrouter_metadata_1.coerceFiniteNumber)(usage.cost) ??
            (0, openrouter_metadata_1.coerceFiniteNumber)(usage.total_cost) ??
            (0, openrouter_metadata_1.coerceFiniteNumber)(payload.total_cost) ??
            (0, openrouter_metadata_1.coerceFiniteNumber)(payload.cost),
        usage: (0, openrouter_metadata_1.normalizeProviderBillingUsage)({
            inputTokens: usage.prompt_tokens ?? usage.input_tokens,
            outputTokens: usage.completion_tokens ?? usage.output_tokens,
            cacheReadTokens: usage.cache_read_input_tokens ?? usage.cache_read_tokens,
            cacheWriteTokens: usage.cache_creation_input_tokens ?? usage.cache_write_tokens,
            totalTokens: usage.total_tokens,
        }),
    };
}
function summarizeOpenRouterImageResponse(payload) {
    if (!isRecord(payload)) {
        return {
            topLevelKeys: [],
            dataCount: 0,
            hasImageBytes: false,
            hasUsage: false,
            hasResponseId: false,
        };
    }
    const data = Array.isArray(payload.data) ? payload.data : [];
    return {
        topLevelKeys: Object.keys(payload).sort().slice(0, 20),
        dataCount: data.length,
        hasImageBytes: data.some((entry) => isRecord(entry) && typeof entry.b64_json === 'string' && entry.b64_json.length > 0),
        hasUsage: isRecord(payload.usage),
        hasResponseId: typeof payload.id === 'string' && payload.id.length > 0,
    };
}
function isRecord(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
//# sourceMappingURL=openrouter-image-output.js.map