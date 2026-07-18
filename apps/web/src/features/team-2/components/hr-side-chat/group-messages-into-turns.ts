import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'

export interface MessageTurn {
  user: Message
  responses: Message[]
}

export function groupMessagesIntoTurns(displayMessages: Message[]): {
  leadingMessages: Message[]
  turns: MessageTurn[]
} {
  const leadingMessages: Message[] = []
  const turns: MessageTurn[] = []
  let currentTurn: MessageTurn | null = null

  for (const m of displayMessages) {
    if (m.role === 'user') {
      const isVoice = (m.metadata as Record<string, unknown>)?.source === 'voice_live'
      if (isVoice && currentTurn) {
        currentTurn.responses.push(m)
      } else {
        if (currentTurn) turns.push(currentTurn)
        currentTurn = { user: m, responses: [] }
      }
    } else if (currentTurn) {
      currentTurn.responses.push(m)
    } else {
      leadingMessages.push(m)
    }
  }
  if (currentTurn) turns.push(currentTurn)
  return { leadingMessages, turns }
}
