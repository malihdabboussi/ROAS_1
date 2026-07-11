"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_RUNTIME_REDIS_URL_ENV_KEYS = exports.AGENT_RUNTIME_SUB_AGENT_QUEUE = exports.AGENT_RUNTIME_AUTOMATION_QUEUE = exports.AGENT_RUNTIME_ARTIFACT_QUEUE = exports.AGENT_RUNTIME_MISSION_QUEUE = exports.AGENT_RUNTIME_BRAIN_IMPORT_QUEUE = exports.AGENT_RUNTIME_BRAIN_QUEUE = exports.AGENT_RUNTIME_CHAT_QUEUE = exports.AGENT_RUNTIME_QUEUE_NAMES = void 0;
exports.resolveAgentRuntimeRedisUrl = resolveAgentRuntimeRedisUrl;
exports.resolveAgentRuntimeRedisPrefix = resolveAgentRuntimeRedisPrefix;
exports.AGENT_RUNTIME_QUEUE_NAMES = {
    chat: 'agent-runtime-queue-chat',
    brain: 'agent-runtime-queue-brain',
    brain_import: 'agent-runtime-queue-brain-import',
    mission: 'agent-runtime-queue-mission',
    artifact: 'agent-runtime-queue-artifact',
    automation: 'agent-runtime-queue-automation',
    sub_agent: 'agent-runtime-queue-subagent',
};
exports.AGENT_RUNTIME_CHAT_QUEUE = exports.AGENT_RUNTIME_QUEUE_NAMES.chat;
exports.AGENT_RUNTIME_BRAIN_QUEUE = exports.AGENT_RUNTIME_QUEUE_NAMES.brain;
exports.AGENT_RUNTIME_BRAIN_IMPORT_QUEUE = exports.AGENT_RUNTIME_QUEUE_NAMES.brain_import;
exports.AGENT_RUNTIME_MISSION_QUEUE = exports.AGENT_RUNTIME_QUEUE_NAMES.mission;
exports.AGENT_RUNTIME_ARTIFACT_QUEUE = exports.AGENT_RUNTIME_QUEUE_NAMES.artifact;
exports.AGENT_RUNTIME_AUTOMATION_QUEUE = exports.AGENT_RUNTIME_QUEUE_NAMES.automation;
exports.AGENT_RUNTIME_SUB_AGENT_QUEUE = exports.AGENT_RUNTIME_QUEUE_NAMES.sub_agent;
exports.AGENT_RUNTIME_REDIS_URL_ENV_KEYS = [
    'REDIS_URL_AGENT_QUEUE',
    'REDIS_URL_AGENT_STREAM',
    'REDIS_URL_MISSIONS',
    'REDIS_URL',
];
function resolveAgentRuntimeRedisUrl(env = process.env) {
    for (const key of exports.AGENT_RUNTIME_REDIS_URL_ENV_KEYS) {
        const value = env[key]?.trim();
        if (value)
            return value;
    }
    return '';
}
function resolveAgentRuntimeRedisPrefix(env = process.env) {
    return env.REDIS_QUEUE_PREFIX?.trim() || 'bull';
}
//# sourceMappingURL=agent-runtime-queues.js.map