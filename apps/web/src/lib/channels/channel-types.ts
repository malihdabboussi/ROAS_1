export interface ChannelMember {
  id: string
  channel_id: string
  member_type: 'user' | 'agent'
  user_id: string | null
  agent_key: string | null
  role: 'admin' | 'edit' | 'view'
  added_by: string | null
  joined_at: string
  created_at: string
  profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface ChannelMention {
  type:
    | 'user'
    | 'agent'
    | 'task'
    | 'doc'
    | 'channel'
    | 'space'
    | 'mission'
    | 'person'
    | 'conversation'
  user_id?: string
  agent_key?: string
  entity_id?: string
  label?: string
}
