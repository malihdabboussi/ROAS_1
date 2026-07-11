"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coerceFiniteNumber = coerceFiniteNumber;
exports.extractOpenRouterGenerationId = extractOpenRouterGenerationId;
exports.readHeaderValue = readHeaderValue;
exports.readOpenRouterGenerationId = readOpenRouterGenerationId;
exports.readOpenRouterRequestId = readOpenRouterRequestId;
exports.normalizeProviderBillingUsage = normalizeProviderBillingUsage;
exports.normalizeOpenRouterGenerationPayload = normalizeOpenRouterGenerationPayload;
exports.validateOpenRouterSettledCost = validateOpenRouterSettledCost;
const OPENROUTER_GENERATION_HEADER_NAMES = [
    'x-generation-id',
    'x-openrouter-generation-id',
    'openrouter-generation-id',
];
const OPENROUTER_REQUEST_HEADER_NAMES = ['x-request-id', 'cf-ray', 'request-id'];
function coerceFiniteNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
}
function extractOpenRouterGenerationId(value) {
    if (typeof value === 'string' && value.trim())
        return value.trim();
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const record = value;
    return (extractOpenRouterGenerationId(record.provider_generation_id) ??
        extractOpenRouterGenerationId(record.generation_id) ??
        extractOpenRouterGenerationId(record.provider_response_id) ??
        extractOpenRouterGenerationId(record.id));
}
function readHeaderValue(headers, names) {
    if (!headers)
        return null;
    const getter = headers.get;
    if (typeof getter === 'function') {
        for (const name of names) {
            const value = getter.call(headers, name);
            if (value)
                return value;
        }
        return null;
    }
    const record = headers;
    const lowerKeys = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));
    for (const name of names) {
        const matchingKey = lowerKeys.get(name.toLowerCase());
        if (!matchingKey)
            continue;
        const value = record[matchingKey];
        if (Array.isArray(value))
            return value.find((entry) => entry.trim())?.trim() ?? null;
        if (value !== null && value !== undefined && String(value).trim())
            return String(value).trim();
    }
    return null;
}
function readOpenRouterGenerationId(headers) {
    return extractOpenRouterGenerationId(readHeaderValue(headers, OPENROUTER_GENERATION_HEADER_NAMES));
}
function readOpenRouterRequestId(headers) {
    return readHeaderValue(headers, OPENROUTER_REQUEST_HEADER_NAMES);
}
function normalizeProviderBillingUsage(input) {
    const inputTokens = Math.max(0, Math.trunc(coerceFiniteNumber(input.inputTokens) ?? 0));
    const outputTokens = Math.max(0, Math.trunc(coerceFiniteNumber(input.outputTokens) ?? 0));
    const cacheRead = Math.max(0, Math.trunc(coerceFiniteNumber(input.cacheReadTokens) ?? 0));
    const cacheWrite = Math.max(0, Math.trunc(coerceFiniteNumber(input.cacheWriteTokens) ?? 0));
    const explicitTotal = coerceFiniteNumber(input.totalTokens);
    return {
        input: inputTokens,
        output: outputTokens,
        cacheRead,
        cacheWrite,
        totalTokens: Math.max(0, Math.trunc(explicitTotal ?? inputTokens + outputTokens + cacheRead + cacheWrite)),
    };
}
function normalizeOpenRouterGenerationPayload(payload) {
    const root = payload && typeof payload === 'object' ? payload : {};
    const data = root.data && typeof root.data === 'object' && !Array.isArray(root.data)
        ? root.data
        : root;
    const generationId = extractOpenRouterGenerationId(data.id) ??
        extractOpenRouterGenerationId(data.generation_id) ??
        extractOpenRouterGenerationId(data.provider_generation_id) ??
        '';
    const usage = normalizeProviderBillingUsage({
        inputTokens: data.input_tokens ??
            data.tokens_prompt ??
            data.prompt_tokens ??
            data.native_tokens_prompt,
        outputTokens: data.output_tokens ??
            data.tokens_completion ??
            data.completion_tokens ??
            data.native_tokens_completion,
        cacheReadTokens: data.cache_read_tokens ?? data.cache_read_input_tokens,
        cacheWriteTokens: data.cache_write_tokens ?? data.cache_creation_input_tokens,
        totalTokens: data.total_tokens,
    });
    const status = typeof data.status === 'string' ? data.status : undefined;
    const finishReason = typeof data.finish_reason === 'string' ? data.finish_reason : undefined;
    const cancelled = data.cancelled === true ||
        status === 'cancelled' ||
        finishReason === 'cancelled';
    const noCharge = data.no_charge === true || data.billing_status === 'no_charge';
    return {
        generationId,
        model: typeof data.model === 'string' ? data.model : undefined,
        resolvedModel: typeof data.resolved_model === 'string'
            ? data.resolved_model
            : typeof data.model === 'string'
                ? data.model
                : undefined,
        providerName: typeof data.provider_name === 'string'
            ? data.provider_name
            : typeof data.provider === 'string'
                ? data.provider
                : undefined,
        costUsd: coerceFiniteNumber(data.total_cost) ??
            coerceFiniteNumber(data.cost) ??
            coerceFiniteNumber(data.usage?.cost),
        usage,
        cancelled,
        noCharge,
        status,
        finishReason,
        raw: data,
    };
}
function validateOpenRouterSettledCost(settlement, modelName) {
    if (settlement.costUsd === null)
        return { acceptable: false, reason: 'missing_cost' };
    if (settlement.costUsd > 0)
        return { acceptable: true };
    if (settlement.cancelled)
        return { acceptable: true, reason: 'cancelled' };
    if (settlement.noCharge)
        return { acceptable: true, reason: 'no_charge' };
    const model = (modelName ?? settlement.resolvedModel ?? settlement.model ?? '').toLowerCase();
    if (model.includes(':free') || model.includes('/free')) {
        return { acceptable: true, reason: 'free_model' };
    }
    return { acceptable: false, reason: 'paid_model_zero_cost' };
}
//# sourceMappingURL=openrouter-metadata.js.map