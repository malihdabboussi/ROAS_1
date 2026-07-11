import type { OpenRouterGenerationSettlement } from './provider-billing.types';
export declare const OPENROUTER_GENERATION_LOOKUP_URL = "https://openrouter.ai/api/v1/generation";
export declare class OpenRouterGenerationLookupError extends Error {
    readonly status: number;
    readonly retryable: boolean;
    readonly responseBody?: string;
    constructor(message: string, status: number, retryable: boolean, responseBody?: string);
}
export interface FetchOpenRouterGenerationOptions {
    apiKey: string;
    generationId: string;
    fetchImpl?: typeof fetch;
    appTitle?: string;
    referer?: string;
}
export declare function fetchOpenRouterGeneration(options: FetchOpenRouterGenerationOptions): Promise<OpenRouterGenerationSettlement>;
export declare function isRetryableOpenRouterGenerationStatus(status: number): boolean;
export declare function isRetryableOpenRouterGenerationLookupError(error: unknown): boolean;
export declare function isOpenRouterSettlementReady(settlement: OpenRouterGenerationSettlement, modelName?: string | null): boolean;
