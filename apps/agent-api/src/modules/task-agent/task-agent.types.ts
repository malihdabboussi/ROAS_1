import type { OpenClawInputMessage } from '../chat/services/openclaw-proxy.service'

export interface InvokePayload {
  item_id: string
  space_id: string
  agent_key: string
  user_id: string
  org_id: string | null
  campaign_id?: string | null
  prompt: string
  activity_id?: string
  conversation_refs?: Array<{ id: string; label?: string }>
  include?: Record<string, boolean>
  extra_notes?: string
  skill_keys?: string[]
  agent_collaboration?: 'allowed' | 'disabled'
  execution_batch_id?: string
  execution_batch_agent_keys?: string[]
}

export interface CancelTaskAgentPayload {
  item_id: string
  space_id: string
  user_id: string
  org_id: string | null
}

export function openClawInputToTrace(msgs: OpenClawInputMessage[]) {
  return msgs.map((m) => {
    const c = m.content
    if (typeof c === 'string') return { type: m.type, role: m.role, content: c }
    if (Array.isArray(c))
      return { type: m.type, role: m.role, content: `[${c.length} content parts]` }
    return { type: m.type, role: m.role, content: String(c) }
  })
}
