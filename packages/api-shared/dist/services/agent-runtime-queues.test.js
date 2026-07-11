"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const agent_runtime_queues_1 = require("./agent-runtime-queues");
(0, vitest_1.describe)('agent runtime queues', () => {
    (0, vitest_1.it)('keeps canonical queue names stable', () => {
        (0, vitest_1.expect)(agent_runtime_queues_1.AGENT_RUNTIME_QUEUE_NAMES).toMatchObject({
            chat: 'agent-runtime-queue-chat',
            brain: 'agent-runtime-queue-brain',
            brain_import: 'agent-runtime-queue-brain-import',
            mission: 'agent-runtime-queue-mission',
            artifact: 'agent-runtime-queue-artifact',
            automation: 'agent-runtime-queue-automation',
            sub_agent: 'agent-runtime-queue-subagent',
        });
        (0, vitest_1.expect)(agent_runtime_queues_1.AGENT_RUNTIME_BRAIN_IMPORT_QUEUE).toBe('agent-runtime-queue-brain-import');
    });
    (0, vitest_1.it)('resolves runtime Redis URL by production precedence', () => {
        (0, vitest_1.expect)((0, agent_runtime_queues_1.resolveAgentRuntimeRedisUrl)({
            REDIS_URL_AGENT_QUEUE: ' redis://queue.redis.local ',
            REDIS_URL_AGENT_STREAM: 'redis://stream.redis.local',
            REDIS_URL_MISSIONS: 'redis://missions.redis.local',
            REDIS_URL: 'redis://default.redis.local',
        })).toBe('redis://queue.redis.local');
        (0, vitest_1.expect)((0, agent_runtime_queues_1.resolveAgentRuntimeRedisUrl)({
            REDIS_URL_AGENT_QUEUE: '',
            REDIS_URL_AGENT_STREAM: 'redis://stream.redis.local',
            REDIS_URL_MISSIONS: 'redis://missions.redis.local',
            REDIS_URL: 'redis://default.redis.local',
        })).toBe('redis://stream.redis.local');
        (0, vitest_1.expect)((0, agent_runtime_queues_1.resolveAgentRuntimeRedisUrl)({
            REDIS_URL_AGENT_QUEUE: '',
            REDIS_URL_AGENT_STREAM: '',
            REDIS_URL_MISSIONS: 'redis://missions.redis.local',
            REDIS_URL: 'redis://default.redis.local',
        })).toBe('redis://missions.redis.local');
    });
    (0, vitest_1.it)('uses the shared BullMQ prefix fallback', () => {
        (0, vitest_1.expect)((0, agent_runtime_queues_1.resolveAgentRuntimeRedisPrefix)({ REDIS_QUEUE_PREFIX: ' runtime-bull ' })).toBe('runtime-bull');
        (0, vitest_1.expect)((0, agent_runtime_queues_1.resolveAgentRuntimeRedisPrefix)({ REDIS_QUEUE_PREFIX: '' })).toBe('bull');
    });
});
//# sourceMappingURL=agent-runtime-queues.test.js.map