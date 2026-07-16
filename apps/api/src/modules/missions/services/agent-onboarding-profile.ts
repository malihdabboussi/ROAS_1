export type AgentStyle = 'bold' | 'balanced' | 'calm'

export type AgentTemplateProfileInput = {
  role_key: string
  template_key: string
  skill_seed_key: string
  default_name: string
  name_pool: unknown
  role: string
  level: 'employee' | 'manager' | 'c_level'
  disc_profile: string
  tagline: string
  description: string
  responsibilities: unknown
  skills: unknown
  core_beliefs: unknown
  image_url: string
  specialty?: string
}

export function deriveAgentKey(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'agent'
  )
}

export function resolveCapabilityProfile(
  agentKey: string,
  role: string,
  level: 'system' | 'c_level' | 'manager' | 'employee',
): string {
  if (agentKey === 'vibey') return 'vibey_ceo'
  if (agentKey === 'hr') return 'system_hr'
  if (agentKey === 'brain_scholar' || agentKey === 'atlas') return 'system_brain'
  if (
    agentKey === 'viktor' ||
    agentKey === 'widget_builder' ||
    agentKey.startsWith('viktor_') ||
    agentKey.startsWith('widget_builder_')
  )
    return 'system_builder'
  if (level === 'system') return 'system_hr'
  const roleLower = role.toLowerCase()
  if (roleLower.includes('brain scholar')) return 'system_brain'
  return 'managed_domain'
}

export function resolveCapabilityDomain(agentKey: string, role: string): string {
  const key = agentKey.toLowerCase()
  const roleText = role.toLowerCase()
  if (
    ['copywriter', 'designer', 'media_producer', 'brand_manager', 'ads_manager', 'strategist'].includes(
      key,
    ) ||
    /(copywriter|designer|creative|brand|media|marketing|social|strategist|ads.?manager)/.test(
      roleText,
    )
  ) {
    return 'marketing'
  }
  if (['analyst', 'cfo'].includes(key) || /(analyst|finance|data|performance)/.test(roleText)) {
    return 'analyst'
  }
  if (
    ['developer', 'automation_integrations_engineer', 'qa_engineer', 'pm_product'].includes(key) ||
    /(developer|engineer|automation|integrations|qa|reliability|full-stack|full stack)/.test(
      roleText,
    )
  ) {
    return 'developer'
  }
  if (
    ['customer_support', 'customer_success', 'customer_coach'].includes(key) ||
    /(customer.?success|customer.?support|support.?agent|coach|mentor|client|help.?desk)/.test(
      roleText,
    )
  ) {
    return 'support'
  }
  if (
    ['pm_operations', 'product_manager'].includes(key) ||
    /(operations|project.?manag|coordinator|program.?manag)/.test(roleText)
  ) {
    return 'operations'
  }
  return 'operations'
}

export function normalizeStyle(input?: string): AgentStyle {
  if (input === 'bold' || input === 'balanced' || input === 'calm') return input
  return 'balanced'
}

export function styleLabel(style: AgentStyle): string {
  if (style === 'bold') return 'Bold & Direct'
  if (style === 'calm') return 'Calm & Steady'
  return 'Balanced'
}

export function styleDescription(style: AgentStyle): string {
  if (style === 'bold') return 'No-nonsense, metric-driven, action-oriented'
  if (style === 'calm') return 'Thoughtful, measured, focused on process'
  return 'Professional but approachable, clear communication'
}

export function hasWidgetBuilderEmployee(
  agents: Array<{ role?: string | null; skills?: string[] | null }>,
): boolean {
  return agents.some((agent) => {
    const role = String(agent.role ?? '')
      .trim()
      .toLowerCase()
    const hasWidgetRole = role === 'widget experience engineer'
    const hasWidgetSkill =
      Array.isArray(agent.skills) &&
      agent.skills.some((skill) => String(skill).trim().toLowerCase() === 'widget-builder')
    return hasWidgetRole || hasWidgetSkill
  })
}

export function hasBrainScholarEmployee(
  agents: Array<{ role?: string | null; skills?: string[] | null }>,
): boolean {
  return agents.some((agent) => {
    const role = String(agent.role ?? '')
      .trim()
      .toLowerCase()
    const hasScholarRole = role === 'brain scholar & knowledge curator'
    const hasScholarSkill =
      Array.isArray(agent.skills) &&
      agent.skills.some((skill) => String(skill).trim().toLowerCase() === 'knowledge-extraction')
    return hasScholarRole || hasScholarSkill
  })
}

export function normalizeTemplateProfile(template: AgentTemplateProfileInput) {
  return {
    role_key: template.role_key,
    template_key: template.template_key,
    skill_seed_key: template.skill_seed_key,
    default_name: template.default_name,
    name_pool: toStringArray(template.name_pool),
    role: template.role,
    level: template.level,
    disc_profile: template.disc_profile,
    tagline: template.tagline,
    description: template.description,
    responsibilities: toStringArray(template.responsibilities),
    skills: toStringArray(template.skills),
    core_beliefs: toStringArray(template.core_beliefs),
    image_url: template.image_url,
    specialty: template.specialty ?? '',
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry))
}
