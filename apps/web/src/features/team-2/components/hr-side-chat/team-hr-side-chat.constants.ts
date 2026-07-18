import type {
  DocumentAttachment,
  HighlightedArtifact,
  Message,
} from '@/lib/chat/studio-chat-runtime-adapter'

export const HR_AGENT_KEY = 'hr'
export const HR_AGENT_NAME = 'Jaime'
export const EMPTY_MESSAGES: Message[] = []
export const EMPTY_QUEUE: Array<{
  id: string
  content: string
  documents?: DocumentAttachment[]
  artifacts?: HighlightedArtifact[]
  model?: string
}> = []
export const BOTTOM_SCROLL_THRESHOLD = 80
