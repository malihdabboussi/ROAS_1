import { backendGet } from '@/lib/api/backend-client'
import type { AgentChannel } from './agent-channels'

export async function listAgentChannels(): Promise<AgentChannel[]> {
  return backendGet<AgentChannel[]>('/api/telegram/channels')
}
