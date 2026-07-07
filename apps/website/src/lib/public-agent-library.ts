export type AgentSkillDetail = {
  skill_key: string
  name: string
  description: string
}

export type PublicAgentLibraryRow = {
  role_key: string
  default_name: string
  role: string
  level: string
  image_url: string
  skills: unknown
  tagline: string
  skill_details?: AgentSkillDetail[]
}

export function parseTemplateSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((s) => String(s)).filter(Boolean)
}
