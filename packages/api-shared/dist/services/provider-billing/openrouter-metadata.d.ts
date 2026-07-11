import type { OpenRouterGenerationSettlement, ProviderBillingUsage, ZeroCostValidationResult } from './provider-billing.types';
type HeadersLike = Pick<Headers, 'get'> | Record<string, string | string[] | number | null | undefined>;
export declare function coerceFiniteNumber(value: unknown): number | null;
export declare function extractOpenRouterGenerationId(value: unknown): string | null;
export declare function readHeaderValue(headers: HeadersLike | undefined, names: string[]): string | null;
export declare function readOpenRouterGenerationId(headers: HeadersLike | undefined): string | null;
export declare function readOpenRouterRequestId(headers: HeadersLike | undefined): string | null;
export declare function normalizeProviderBillingUsage(input: {
    inputTokens?: unknown;
    outputTokens?: unknown;
    cacheReadTokens?: unknown;
    cacheWriteTokens?: unknown;
    totalTokens?: unknown;
}): ProviderBillingUsage;
export declare function normalizeOpenRouterGenerationPayload(payload: unknown): OpenRouterGenerationSettlement;
export declare function validateOpenRouterSettledCost(settlement: OpenRouterGenerationSettlement, modelName?: string | null): ZeroCostValidationResult;
export {};
