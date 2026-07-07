import type { OrbAnimationState } from '@/components/chat/BrainVoiceOrbSceneAdapter'
import type { LiveSessionState } from '@/lib/brain/brain-live-session-adapter'
import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'

export const EMPTY_MESSAGES: Message[] = []
export const BOTTOM_SCROLL_THRESHOLD = 80

export interface AgentVoiceTurnData {
  leadingMessages: Message[]
  turns: Array<{ user: Message; responses: Message[] }>
}

export function buildAgentVoiceTurnData(visibleMessages: Message[]): AgentVoiceTurnData {
  const leadingMessages: Message[] = []
  const turns: AgentVoiceTurnData['turns'] = []
  let currentTurn: AgentVoiceTurnData['turns'][number] | null = null

  for (const message of visibleMessages) {
    if (message.role === 'user') {
      if (currentTurn) turns.push(currentTurn)
      currentTurn = { user: message, responses: [] }
    } else if (currentTurn) {
      currentTurn.responses.push(message)
    } else {
      leadingMessages.push(message)
    }
  }
  if (currentTurn) turns.push(currentTurn)
  return { leadingMessages, turns }
}

export function formatVoiceElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function getAgentVoiceOrbState(state: LiveSessionState): OrbAnimationState {
  if (state === 'idle' || state === 'error') return 'idle'
  if (state === 'connecting') return 'connecting'
  if (state === 'toolCall') return 'toolCall'
  if (state === 'speaking') return 'speaking'
  return 'listening'
}
