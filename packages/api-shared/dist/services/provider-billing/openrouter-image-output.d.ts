import type { ProviderBillingUsage } from './provider-billing.types';
export type OpenRouterImageOutput = {
    imageBytesB64: string;
    mimeType: string;
    resolvedModel: string | null;
    providerCostUsd: number | null;
    usage: ProviderBillingUsage;
};
export type OpenRouterImageResponseShape = {
    topLevelKeys: string[];
    dataCount: number;
    hasImageBytes: boolean;
    hasUsage: boolean;
    hasResponseId: boolean;
};
export declare class ProviderOutputValidationError extends Error {
    readonly attemptId: string;
    readonly providerGenerationId: string | null;
    readonly providerCostUsd: number | null;
    readonly providerEffectConfirmed: boolean;
    constructor(input: {
        attemptId: string;
        providerGenerationId: string | null;
        providerCostUsd: number | null;
        providerEffectConfirmed: boolean;
    });
}
export declare function parseOpenRouterImageOutput(payload: unknown): OpenRouterImageOutput | null;
export declare function summarizeOpenRouterImageResponse(payload: unknown): OpenRouterImageResponseShape;
