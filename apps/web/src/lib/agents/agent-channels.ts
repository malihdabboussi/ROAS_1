export interface AgentChannel {
  id: string
  user_id: string
  agent_key: string
  channel_type: string
  provider_config: Record<string, unknown>
  is_active: boolean
  is_public: boolean
  last_message_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}
