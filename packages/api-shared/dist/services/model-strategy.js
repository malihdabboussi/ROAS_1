"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isModelStrategy = isModelStrategy;
exports.resolveModelForStrategy = resolveModelForStrategy;
exports.resolveChatStageModel = resolveChatStageModel;
exports.resolveFallbackForStrategy = resolveFallbackForStrategy;
const AUTO_MODEL_ID = 'openai/gpt-5.6-terra';
const HIGH_STAKES_MODEL_ID = 'anthropic/claude-opus-5';
const ECONOMY_MODEL_ID = 'openai/gpt-5.6-terra';
const AUTO_WRITE_MODEL_ID = 'anthropic/claude-sonnet-4.6';
const QUALITY_FALLBACK_MODEL_ID = 'anthropic/claude-sonnet-4.6';
const AUTO_MODEL_SETTINGS = {
    context_window_tokens: 272_000,
    reasoning_effort: 'medium',
    speed_mode: 'standard',
};
const POWER_MODEL_SETTINGS = {
    context_window_tokens: 300_000,
    reasoning_effort: 'medium',
    speed_mode: 'standard',
};
const ECONOMY_MODEL_SETTINGS = {
    context_window_tokens: 272_000,
    reasoning_effort: 'low',
    speed_mode: 'standard',
};
const CHAT_RESEARCH_MODEL_SETTINGS = {
    context_window_tokens: 128_000,
    reasoning_effort: 'low',
    speed_mode: 'standard',
};
const CHAT_WRITER_MODEL_SETTINGS = {
    context_window_tokens: 128_000,
    reasoning_effort: 'medium',
    speed_mode: 'standard',
};
const AUTO_WRITE_MODEL_SETTINGS = {
    context_window_tokens: 64_000,
    reasoning_effort: 'medium',
    speed_mode: 'standard',
};
function routedModel(modelId, modelSettings, reason) {
    return {
        modelId,
        reason,
        modelSettings,
    };
}
const STRATEGY_MATRIX = {
    'auto:economy': {
        chat: routedModel(ECONOMY_MODEL_ID, ECONOMY_MODEL_SETTINGS, 'economy_chat'),
        mission_plan: routedModel(ECONOMY_MODEL_ID, ECONOMY_MODEL_SETTINGS, 'economy_mission_plan'),
        mission_execute: routedModel(ECONOMY_MODEL_ID, ECONOMY_MODEL_SETTINGS, 'economy_mission_execute'),
        mission_review: routedModel(ECONOMY_MODEL_ID, ECONOMY_MODEL_SETTINGS, 'economy_mission_review'),
        mission_awareness: routedModel(ECONOMY_MODEL_ID, ECONOMY_MODEL_SETTINGS, 'economy_mission_awareness'),
        mission_quality_eval: routedModel(ECONOMY_MODEL_ID, ECONOMY_MODEL_SETTINGS, 'economy_mission_quality_eval'),
    },
    auto: {
        chat: routedModel(AUTO_MODEL_ID, AUTO_MODEL_SETTINGS, 'auto_chat'),
        mission_plan: routedModel(AUTO_MODEL_ID, AUTO_MODEL_SETTINGS, 'auto_mission_plan'),
        mission_execute: routedModel(AUTO_MODEL_ID, AUTO_MODEL_SETTINGS, 'auto_mission_execute'),
        mission_review: routedModel(AUTO_MODEL_ID, AUTO_MODEL_SETTINGS, 'auto_mission_review'),
        mission_awareness: routedModel(AUTO_MODEL_ID, AUTO_MODEL_SETTINGS, 'auto_mission_awareness'),
        mission_quality_eval: routedModel(AUTO_MODEL_ID, AUTO_MODEL_SETTINGS, 'auto_mission_quality_eval'),
    },
    'auto:power': {
        chat: routedModel(HIGH_STAKES_MODEL_ID, POWER_MODEL_SETTINGS, 'power_chat'),
        mission_plan: routedModel(HIGH_STAKES_MODEL_ID, POWER_MODEL_SETTINGS, 'power_mission_plan'),
        mission_execute: routedModel(HIGH_STAKES_MODEL_ID, POWER_MODEL_SETTINGS, 'power_mission_execute'),
        mission_review: routedModel(HIGH_STAKES_MODEL_ID, POWER_MODEL_SETTINGS, 'power_mission_review'),
        mission_awareness: routedModel(HIGH_STAKES_MODEL_ID, POWER_MODEL_SETTINGS, 'power_mission_awareness'),
        mission_quality_eval: routedModel(HIGH_STAKES_MODEL_ID, POWER_MODEL_SETTINGS, 'power_mission_quality_eval'),
    },
};
function isModelStrategy(value) {
    return value === 'auto' || value === 'auto:economy' || value === 'auto:power';
}
function resolveModelForStrategy(strategy, task) {
    return STRATEGY_MATRIX[strategy][task];
}
function resolveChatStageModel(strategy, stage) {
    if (strategy === 'auto:economy') {
        return routedModel(ECONOMY_MODEL_ID, CHAT_RESEARCH_MODEL_SETTINGS, `economy_chat_${stage}`);
    }
    if (strategy === 'auto:power') {
        return routedModel(HIGH_STAKES_MODEL_ID, stage === 'research' ? CHAT_RESEARCH_MODEL_SETTINGS : CHAT_WRITER_MODEL_SETTINGS, `power_chat_${stage}`);
    }
    return stage === 'research'
        ? routedModel(ECONOMY_MODEL_ID, CHAT_RESEARCH_MODEL_SETTINGS, 'auto_chat_research')
        : routedModel(AUTO_WRITE_MODEL_ID, AUTO_WRITE_MODEL_SETTINGS, 'auto_chat_write');
}
const FALLBACK_MATRIX = {
    'auto:economy': {
        chat: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'economy_chat_fallback' },
        mission_plan: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'economy_mission_plan_fallback',
        },
        mission_execute: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'economy_mission_execute_fallback',
        },
        mission_review: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'economy_mission_review_fallback',
        },
        mission_awareness: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'economy_mission_awareness_fallback',
        },
        mission_quality_eval: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'economy_mission_quality_eval_fallback',
        },
    },
    auto: {
        chat: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'auto_chat_fallback' },
        mission_plan: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'auto_mission_plan_fallback' },
        mission_execute: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'auto_mission_execute_fallback',
        },
        mission_review: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'auto_mission_review_fallback' },
        mission_awareness: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'auto_mission_awareness_fallback',
        },
        mission_quality_eval: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'auto_mission_quality_eval_fallback',
        },
    },
    'auto:power': {
        chat: { modelId: QUALITY_FALLBACK_MODEL_ID, reason: 'power_chat_fallback' },
        mission_plan: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'power_mission_plan_fallback',
        },
        mission_execute: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'power_mission_execute_fallback',
        },
        mission_review: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'power_mission_review_fallback',
        },
        mission_awareness: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'power_mission_awareness_fallback',
        },
        mission_quality_eval: {
            modelId: QUALITY_FALLBACK_MODEL_ID,
            reason: 'power_mission_quality_eval_fallback',
        },
    },
};
function resolveFallbackForStrategy(strategy, task) {
    return FALLBACK_MATRIX[strategy][task];
}
//# sourceMappingURL=model-strategy.js.map