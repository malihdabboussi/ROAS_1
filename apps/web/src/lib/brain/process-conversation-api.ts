import { backendPost } from '@/lib/api/backend-client'

export interface ProcessConversationMessage {
  role?: string
  speaker?: string
  content?: string
  text?: string
}

export interface ProcessConversationInput {
  messages: ProcessConversationMessage[]
  owner_id?: string
  campaign_id?: string
  brain_id?: string
  source_id?: string
  source_title?: string
  source_type?: string
  agent_id?: string
  agent_name?: string
  session_key?: string
}

export interface ProcessConversationResult {
  status: string
  memories_created?: number
  reason?: string
}

export async function processConversationToBrain(
  input: ProcessConversationInput,
): Promise<ProcessConversationResult> {
  return backendPost<ProcessConversationResult>('/api/brain/process/conversation', input)
}
