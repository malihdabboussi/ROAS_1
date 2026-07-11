"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isModelStrategy = isModelStrategy;
exports.resolveModelForStrategy = resolveModelForStrategy;
exports.resolveFallbackForStrategy = resolveFallbackForStrategy;
const POWER_MODEL_ID = 'anthropic/claude-opus-4.8';
const POWER_MODEL_SETTINGS = {
    context_window_tokens: 1_000_000,
    reasoning_effort: 'high',
    speed_mode: 'standard',
};
function powerModel(reason) {
    return {
        modelId: POWER_MODEL_ID,
        reason,
        modelSettings: POWER_MODEL_SETTINGS,
    };
}
const STRATEGY_MATRIX = {
    'auto:economy': {
        chat: {
            modelId: 'google/gemini-3.5-flash',
            reason: 'economy_chat',
        },
        mission_plan: {
            modelId: 'google/gemini-3.1-pro-preview',
            reason: 'economy_mission_plan',
        },
        mission_execute: {
            modelId: 'google/gemini-3.5-flash',
            reason: 'economy_mission_execute',
        },
        mission_review: {
            modelId: 'google/gemini-3.1-pro-preview',
            reason: 'economy_mission_review',
        },
        mission_awareness: {
            modelId: 'google/gemini-3.1-pro-preview',
            reason: 'economy_mission_awareness',
        },
    },
    auto: {
        chat: {
            modelId: 'anthropic/claude-sonnet-4.6',
            reason: 'auto_chat',
        },
        mission_plan: {
            modelId: 'anthropic/claude-sonnet-4.6',
            reason: 'auto_mission_plan',
        },
        mission_execute: {
            modelId: 'anthropic/claude-sonnet-4.6',
            reason: 'auto_mission_execute',
        },
        mission_review: {
            modelId: 'anthropic/claude-sonnet-4.6',
            reason: 'auto_mission_review',
        },
        mission_awareness: {
            modelId: 'anthropic/claude-sonnet-4.6',
            reason: 'auto_mission_awareness',
        },
    },
    'auto:power': {
        chat: powerModel('power_chat'),
        mission_plan: powerModel('power_mission_plan'),
        mission_execute: powerModel('power_mission_execute'),
        mission_review: powerModel('power_mission_review'),
        mission_awareness: powerModel('power_mission_awareness'),
    },
};
function isModelStrategy(value) {
    return value === 'auto' || value === 'auto:economy' || value === 'auto:power';
}
function resolveModelForStrategy(strategy, task) {
    return STRATEGY_MATRIX[strategy][task];
}
const FALLBACK_MATRIX = {
    'auto:economy': {
        chat: { modelId: 'anthropic/claude-haiku-4.5', reason: 'economy_chat_fallback' },
        mission_plan: {
            modelId: 'anthropic/claude-haiku-4.5',
            reason: 'economy_mission_plan_fallback',
        },
        mission_execute: {
            modelId: 'anthropic/claude-haiku-4.5',
            reason: 'economy_mission_execute_fallback',
        },
        mission_review: {
            modelId: 'anthropic/claude-haiku-4.5',
            reason: 'economy_mission_review_fallback',
        },
        mission_awareness: {
            modelId: 'anthropic/claude-haiku-4.5',
            reason: 'economy_mission_awareness_fallback',
        },
    },
    auto: {
        chat: { modelId: 'openai/gpt-5.4', reason: 'auto_chat_fallback' },
        mission_plan: { modelId: 'openai/gpt-5.4', reason: 'auto_mission_plan_fallback' },
        mission_execute: { modelId: 'openai/gpt-5.4', reason: 'auto_mission_execute_fallback' },
        mission_review: { modelId: 'openai/gpt-5.4', reason: 'auto_mission_review_fallback' },
        mission_awareness: { modelId: 'openai/gpt-5.4', reason: 'auto_mission_awareness_fallback' },
    },
    'auto:power': {
        chat: { modelId: 'google/gemini-3.1-pro-preview', reason: 'power_chat_fallback' },
        mission_plan: {
            modelId: 'google/gemini-3.1-pro-preview',
            reason: 'power_mission_plan_fallback',
        },
        mission_execute: {
            modelId: 'google/gemini-3.1-pro-preview',
            reason: 'power_mission_execute_fallback',
        },
        mission_review: {
            modelId: 'google/gemini-3.1-pro-preview',
            reason: 'power_mission_review_fallback',
        },
        mission_awareness: {
            modelId: 'google/gemini-3.1-pro-preview',
            reason: 'power_mission_awareness_fallback',
        },
    },
};
function resolveFallbackForStrategy(strategy, task) {
    return FALLBACK_MATRIX[strategy][task];
}
//# sourceMappingURL=model-strategy.js.map