export type AgentKey = string
export type AgentStatus = 'online' | 'idle' | 'working' | 'offline'

export interface AgentStats {
  execution_speed?: number
  quality?: number
  reliability?: number
  initiative?: number
  communication?: number
  spec_adherence?: number
  learning_rate?: number
  overall?: number
  missions_scored?: number
  last_scored_at?: string | null
}

export interface MissionAgent {
  id: string
  user_id: string
  agent_key: AgentKey
  name: string
  role: string
  status: AgentStatus
  skills: string[]
  level?: string
  specialty?: string | null
  image_url?: string | null
  is_active?: boolean
  team_id?: string | null
  config?: Record<string, unknown>
  stats?: AgentStats
  sync_status?: 'pending' | 'syncing' | 'ready' | 'failed'
  sort_order?: number
  created_at: string
  updated_at: string
}

export interface MissionAgentSkillResource {
  id: string
  agent_key: string
  skill_key: string
  file_path: string
  content?: string | null
  content_type: string | null
  storage_url: string | null
}

export interface MissionAgentSkill {
  id: string
  user_id: string | null
  org_id?: string | null
  agent_key: AgentKey
  skill_key: string
  name: string
  description: string
  markdown_content?: string
  is_enabled: boolean
  is_system?: boolean
  source?: 'system' | 'template' | 'default' | 'user'
  resources?: MissionAgentSkillResource[]
  created_at: string
  updated_at: string
}
