import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'

export const agents = MARKETING_AGENT_LIBRARY_FALLBACK
export const vibeyPortrait = VIBEY_MARKETING_PORTRAIT_FALLBACK
export const agentByKey = (key: string) =>
  agents.find((a) => a.role_key === key)?.image_url ?? vibeyPortrait
