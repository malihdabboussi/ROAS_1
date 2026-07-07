export type ChatRenderMessageRole = 'user' | 'assistant' | 'system'

export interface ChatRenderContentBlock {
  id: string
  type: 'text' | 'reasoning' | 'tool_call' | 'tool_result' | 'status'
  content: string
  metadata?: Record<string, unknown>
}

export interface ChatRenderMessage {
  id: string
  conversation_id: string
  role: ChatRenderMessageRole
  content: string | null
  content_blocks: ChatRenderContentBlock[] | null
  metadata: Record<string, unknown>
  model_id?: string | null
  created_at: string
}
