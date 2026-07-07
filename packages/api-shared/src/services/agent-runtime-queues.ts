export type AgentRuntimeWorkload =
  | 'chat'
  | 'brain'
  | 'brain_import'
  | 'mission'
  | 'artifact'
  | 'automation'
  | 'sub_agent'

export const AGENT_RUNTIME_QUEUE_NAMES: Record<AgentRuntimeWorkload, string> = {
  chat: 'agent-runtime-queue-chat',
  brain: 'agent-runtime-queue-brain',
  brain_import: 'agent-runtime-queue-brain-import',
  mission: 'agent-runtime-queue-mission',
  artifact: 'agent-runtime-queue-artifact',
  automation: 'agent-runtime-queue-automation',
  sub_agent: 'agent-runtime-queue-subagent',
}

export const AGENT_RUNTIME_CHAT_QUEUE = AGENT_RUNTIME_QUEUE_NAMES.chat
export const AGENT_RUNTIME_BRAIN_QUEUE = AGENT_RUNTIME_QUEUE_NAMES.brain
export const AGENT_RUNTIME_BRAIN_IMPORT_QUEUE = AGENT_RUNTIME_QUEUE_NAMES.brain_import
export const AGENT_RUNTIME_MISSION_QUEUE = AGENT_RUNTIME_QUEUE_NAMES.mission
export const AGENT_RUNTIME_ARTIFACT_QUEUE = AGENT_RUNTIME_QUEUE_NAMES.artifact
export const AGENT_RUNTIME_AUTOMATION_QUEUE = AGENT_RUNTIME_QUEUE_NAMES.automation
export const AGENT_RUNTIME_SUB_AGENT_QUEUE = AGENT_RUNTIME_QUEUE_NAMES.sub_agent

export const AGENT_RUNTIME_REDIS_URL_ENV_KEYS = [
  'REDIS_URL_AGENT_QUEUE',
  'REDIS_URL_AGENT_STREAM',
  'REDIS_URL_MISSIONS',
  'REDIS_URL',
] as const

export type AgentRuntimeRedisEnvKey = (typeof AGENT_RUNTIME_REDIS_URL_ENV_KEYS)[number]

export type AgentRuntimeEnv = Record<string, string | undefined>

export function resolveAgentRuntimeRedisUrl(env: AgentRuntimeEnv = process.env): string {
  for (const key of AGENT_RUNTIME_REDIS_URL_ENV_KEYS) {
    const value = env[key]?.trim()
    if (value) return value
  }
  return ''
}

export function resolveAgentRuntimeRedisPrefix(env: AgentRuntimeEnv = process.env): string {
  return env.REDIS_QUEUE_PREFIX?.trim() || 'bull'
}
