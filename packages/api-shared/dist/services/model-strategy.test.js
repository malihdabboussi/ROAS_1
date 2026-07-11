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
];
(0, vitest_1.describe)('model strategy routing', () => {
    (0, vitest_1.it)('routes Power tasks to Opus 4.8 with 1M context and high thinking', () => {
        for (const task of TASKS) {
            (0, vitest_1.expect)((0, model_strategy_1.resolveModelForStrategy)('auto:power', task)).toEqual({
                modelId: 'anthropic/claude-opus-4.8',
                reason: vitest_1.expect.stringMatching(/^power_/),
                modelSettings: {
                    context_window_tokens: 1_000_000,
                    reasoning_effort: 'high',
                    speed_mode: 'standard',
                },
            });
        }
    });
    (0, vitest_1.it)('does not use Fable 5 for Power fallback routing', () => {
        for (const task of TASKS) {
            (0, vitest_1.expect)((0, model_strategy_1.resolveFallbackForStrategy)('auto:power', task).modelId).not.toBe('anthropic/claude-fable-5');
        }
    });
});
//# sourceMappingURL=model-strategy.test.js.map