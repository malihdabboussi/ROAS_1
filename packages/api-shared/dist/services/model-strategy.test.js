"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const model_strategy_1 = require("./model-strategy");
const TASKS = [
    'chat',
    'mission_plan',
    'mission_execute',
    'mission_review',
    'mission_awareness',
    'mission_quality_eval',
];
(0, vitest_1.describe)('model strategy routing', () => {
    (0, vitest_1.it)('routes Auto tasks to discounted GPT-5.6 Terra with bounded context and medium thinking', () => {
        for (const task of TASKS) {
            (0, vitest_1.expect)((0, model_strategy_1.resolveModelForStrategy)('auto', task)).toEqual({
                modelId: 'openai/gpt-5.6-terra',
                reason: vitest_1.expect.stringMatching(/^auto_/),
                modelSettings: {
                    context_window_tokens: 272_000,
                    reasoning_effort: 'medium',
                    speed_mode: 'standard',
                },
            });
        }
    });
    (0, vitest_1.it)('routes Economy tasks to GPT-5.6 Terra with low thinking', () => {
        for (const task of TASKS) {
            (0, vitest_1.expect)((0, model_strategy_1.resolveModelForStrategy)('auto:economy', task)).toEqual({
                modelId: 'openai/gpt-5.6-terra',
                reason: vitest_1.expect.stringMatching(/^economy_/),
                modelSettings: {
                    context_window_tokens: 272_000,
                    reasoning_effort: 'low',
                    speed_mode: 'standard',
                },
            });
        }
    });
    (0, vitest_1.it)('routes explicit Power tasks to Opus 5 with medium thinking', () => {
        for (const task of TASKS) {
            (0, vitest_1.expect)((0, model_strategy_1.resolveModelForStrategy)('auto:power', task)).toEqual({
                modelId: 'anthropic/claude-opus-5',
                reason: vitest_1.expect.stringMatching(/^power_/),
                modelSettings: {
                    context_window_tokens: 300_000,
                    reasoning_effort: 'medium',
                    speed_mode: 'standard',
                },
            });
        }
    });
    (0, vitest_1.it)('uses Sonnet 4.6 as the stable fallback for every strategy', () => {
        for (const strategy of ['auto:economy', 'auto', 'auto:power']) {
            for (const task of TASKS) {
                (0, vitest_1.expect)((0, model_strategy_1.resolveFallbackForStrategy)(strategy, task).modelId).toBe('anthropic/claude-sonnet-4.6');
            }
        }
    });
    (0, vitest_1.it)('keeps Auto research on discounted Terra and restores Auto writing to Sonnet 4.6', () => {
        (0, vitest_1.expect)((0, model_strategy_1.resolveChatStageModel)('auto', 'research')).toEqual({
            modelId: 'openai/gpt-5.6-terra',
            reason: 'auto_chat_research',
            modelSettings: {
                context_window_tokens: 128_000,
                reasoning_effort: 'low',
                speed_mode: 'standard',
            },
        });
        (0, vitest_1.expect)((0, model_strategy_1.resolveChatStageModel)('auto', 'write')).toEqual({
            modelId: 'anthropic/claude-sonnet-4.6',
            reason: 'auto_chat_write',
            modelSettings: {
                context_window_tokens: 64_000,
                reasoning_effort: 'medium',
                speed_mode: 'standard',
            },
        });
    });
    (0, vitest_1.it)('keeps Economy chat on the economy model for both stages', () => {
        (0, vitest_1.expect)((0, model_strategy_1.resolveChatStageModel)('auto:economy', 'research').modelId).toBe('openai/gpt-5.6-terra');
        (0, vitest_1.expect)((0, model_strategy_1.resolveChatStageModel)('auto:economy', 'write').modelId).toBe('openai/gpt-5.6-terra');
    });
});
//# sourceMappingURL=model-strategy.test.js.map