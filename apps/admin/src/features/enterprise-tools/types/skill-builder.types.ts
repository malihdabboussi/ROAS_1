export type SkillBuilderUser = {
  id: string
  email: string | null
  display_name: string | null
  created_at: string | null
}

export type SkillBuilderScope = {
  id: string
  label: string
  kind: 'personal' | 'org'
  org_id: string | null
}

export type SkillBuilderAgent = {
  agent_key: string
  name: string | null
  role: string | null
  level: string | null
  image_url: string | null
  is_active: boolean | null
}

export type SkillBuilderSkill = {
  id: string
  skill_key: string
  name: string
  description: string
  markdown_content: string
  is_enabled: boolean
  is_system?: boolean
  resources?: Array<{
    id: string
    file_path: string
    content?: string | null
  }>
}

export type SkillBuilderSession = {
  id: string
  admin_user_id: string
  acting_user_id: string
  org_id: string | null
  target_agent_key: string
  target_agent_name: string | null
  acting_user_email: string | null
  org_name: string | null
  status: string
  created_at: string
  updated_at: string
}

export type SkillBuilderMessage = {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  content_blocks: unknown[] | null
  created_at: string
}

export type SkillBuilderChatEvent = {
  type: string
  content?: string
  message?: string
  [key: string]: unknown
}
