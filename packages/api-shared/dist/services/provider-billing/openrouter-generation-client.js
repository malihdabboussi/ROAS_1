"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterGenerationLookupError = exports.OPENROUTER_GENERATION_LOOKUP_URL = void 0;
exports.fetchOpenRouterGeneration = fetchOpenRouterGeneration;
exports.isRetryableOpenRouterGenerationStatus = isRetryableOpenRouterGenerationStatus;
exports.isRetryableOpenRouterGenerationLookupError = isRetryableOpenRouterGenerationLookupError;
exports.isOpenRouterSettlementReady = isOpenRouterSettlementReady;
const openrouter_metadata_1 = require("./openrouter-metadata");
exports.OPENROUTER_GENERATION_LOOKUP_URL = 'https://openrouter.ai/api/v1/generation';
class OpenRouterGenerationLookupError extends Error {
    status;
    retryable;
    responseBody;
    constructor(message, status, retryable, responseBody) {
        super(message);
        this.name = 'OpenRouterGenerationLookupError';
        this.status = status;
        this.retryable = retryable;
        this.responseBody = responseBody;
    }
}
exports.OpenRouterGenerationLookupError = OpenRouterGenerationLookupError;
async function fetchOpenRouterGeneration(options) {
    const fetchFn = options.fetchImpl ?? fetch;
    const url = new URL(exports.OPENROUTER_GENERATION_LOOKUP_URL);
    url.searchParams.set('id', options.generationId);
    const headers = {
        Authorization: `Bearer ${options.apiKey}`,
    };
    if (options.appTitle)
        headers['X-Title'] = options.appTitle;
    if (options.referer)
        headers['HTTP-Referer'] = options.referer;
    const response = await fetchFn(url.toString(), { headers });
    if (!response.ok) {
        const body = await safeResponseText(response);
        throw new OpenRouterGenerationLookupError(`OpenRouter generation lookup failed with status ${response.status}`, response.status, isRetryableOpenRouterGenerationStatus(response.status), body);
    }
    const payload = await response.json();
    const settlement = (0, openrouter_metadata_1.normalizeOpenRouterGenerationPayload)(payload);
    if (!settlement.generationId) {
        settlement.raw = {
            ...settlement.raw,
            requested_generation_id: options.generationId,
        };
        return { ...settlement, generationId: options.generationId };
    }
    return settlement;
}
function isRetryableOpenRouterGenerationStatus(status) {
    return status === 404 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
function isRetryableOpenRouterGenerationLookupError(error) {
    return error instanceof OpenRouterGenerationLookupError && error.retryable;
}
function isOpenRouterSettlementReady(settlement, modelName) {
    return (0, openrouter_metadata_1.validateOpenRouterSettledCost)(settlement, modelName).acceptable;
}
async function safeResponseText(response) {
    try {
        const text = await response.text();
        return text.slice(0, 2000);
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=openrouter-generation-client.js.map