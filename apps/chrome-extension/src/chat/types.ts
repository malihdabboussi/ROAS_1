export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type AgentPhase = 'idle' | 'thinking' | 'executing' | 'streaming' | 'complete'

export interface ToolProgressEntry {
  id: string
  detail: string
  timestamp: number
}

export interface ToolBlock {
  id: string
  name: string
  label: string
  action?: string
  toolCallId?: string
  state: 'active' | 'complete' | 'failed'
  startedAt: number
  endedAt?: number
  /** Streaming markdown preview (campaign tool args / tool_content_preview) */
  preview?: string
  progress?: ToolProgressEntry[]
}

export type ContentBlock =
  | { type: 'text'; id: string; content?: string }
  | { type: 'tool'; id: string; tool: ToolBlock }
  | { type: 'thinking_transcript'; id: string; content: string; state: 'active' | 'complete' }
  | { type: 'generation'; id: string; label: string; state: 'active' | 'complete' }

export interface StreamState {
  conversationId: string | null
  messageId: string | null
  phase: AgentPhase
  statusMessage: string | null
  content: string
  contentBlocks: ContentBlock[]
  tools: ToolBlock[]
}
