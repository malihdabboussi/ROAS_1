"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const openrouter_metadata_1 = require("./openrouter-metadata");
(0, vitest_1.describe)('OpenRouter provider billing metadata', () => {
    (0, vitest_1.it)('reads the generation id from OpenRouter response headers', () => {
        const headers = new Headers({
            'x-generation-id': 'gen-abc123',
            'x-request-id': 'req-123',
        });
        (0, vitest_1.expect)((0, openrouter_metadata_1.readOpenRouterGenerationId)(headers)).toBe('gen-abc123');
    });
    (0, vitest_1.it)('normalizes generation API cost and usage fields', () => {
        const settlement = (0, openrouter_metadata_1.normalizeOpenRouterGenerationPayload)({
            data: {
                id: 'gen-abc123',
                model: 'anthropic/claude-sonnet-4.6',
                total_cost: '0.012345',
                tokens_prompt: 1000,
                tokens_completion: 250,
            },
        });
        (0, vitest_1.expect)(settlement).toMatchObject({
            generationId: 'gen-abc123',
            costUsd: 0.012345,
            usage: {
                input: 1000,
                output: 250,
                cacheRead: 0,
                cacheWrite: 0,
                totalTokens: 1250,
            },
        });
    });
    (0, vitest_1.it)('keeps zero-cost paid models pending unless provider marks no-charge', () => {
        const settlement = (0, openrouter_metadata_1.normalizeOpenRouterGenerationPayload)({
            data: {
                id: 'gen-zero',
                model: 'anthropic/claude-sonnet-4.6',
                total_cost: 0,
            },
        });
        (0, vitest_1.expect)((0, openrouter_metadata_1.validateOpenRouterSettledCost)(settlement).acceptable).toBe(false);
        (0, vitest_1.expect)((0, openrouter_metadata_1.validateOpenRouterSettledCost)({
            ...settlement,
            noCharge: true,
        }).acceptable).toBe(true);
    });
    (0, vitest_1.it)('does not treat provider error finishes as no-charge cancellations', () => {
        const settlement = (0, openrouter_metadata_1.normalizeOpenRouterGenerationPayload)({
            data: {
                id: 'gen-error',
                model: 'anthropic/claude-sonnet-4.6',
                total_cost: 0,
                finish_reason: 'error',
            },
        });
        (0, vitest_1.expect)(settlement.cancelled).toBe(false);
        (0, vitest_1.expect)((0, openrouter_metadata_1.validateOpenRouterSettledCost)(settlement).acceptable).toBe(false);
    });
});
//# sourceMappingURL=openrouter-metadata.test.js.map