import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { defaultAgentForSurface } from '@/components/global-chat/config/work-context.config'

export function requestBrainSidebarVoice(agentKey?: string | null): void {
  const resolvedAgentKey = agentKey?.trim() || defaultAgentForSurface('brain')
  useGlobalChatStore.getState().requestVoiceStart(resolvedAgentKey, { surface: 'brain' })
}
