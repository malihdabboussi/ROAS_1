/** Roles auto-provisioned for the Webinar Fulfillment playbook / Agency Client (Webinar) template. */
export const WEBINAR_FULFILLMENT_ROLE_KEYS = [
  'strategist',
  'copywriter',
  'designer',
  'ads_manager',
] as const

export type WebinarFulfillmentRoleKey = (typeof WEBINAR_FULFILLMENT_ROLE_KEYS)[number]

/** agent_key aliases that should satisfy a playbook preferred role slug. */
export const WEBINAR_ROLE_AGENT_KEY_ALIASES: Record<WebinarFulfillmentRoleKey, string[]> = {
  strategist: ['strategist', 'nate', 'reed'],
  copywriter: ['copywriter', 'writer', 'ivy'],
  designer: ['designer', 'aria', 'lux'],
  ads_manager: ['ads_manager', 'blaze'],
}

/** Preferred first names when renaming legacy hires (e.g. Nate → Reed). */
export const WEBINAR_ROLE_PREFERRED_FIRST_NAMES: Record<WebinarFulfillmentRoleKey, string> = {
  strategist: 'Reed',
  copywriter: 'Ivy',
  designer: 'Lux',
  ads_manager: 'Blaze',
}

export const WEBINAR_FULFILLMENT_PLAYBOOK_ID = 'webinar-fulfillment'
export const AGENCY_CLIENT_WEBINAR_TEMPLATE_SLUG = 'agency-client-webinar'

export function formatAgentNameRole(firstName: string, role: string): string {
  const name = firstName.trim()
  const roleTitle = role.trim()
  if (!name) return roleTitle
  if (!roleTitle) return name
  if (name.includes('·')) return name
  return `${name} · ${roleTitle}`
}

export function extractFirstName(displayName: string): string {
  const raw = displayName.trim()
  if (!raw) return ''
  const beforeDot = raw.split('·')[0]?.trim() ?? raw
  return beforeDot.split(/\s+/)[0] ?? beforeDot
}

export function findAgentForWebinarRole(
  agents: Array<{ agent_key?: string | null; name?: string | null; role?: string | null }>,
  roleKey: WebinarFulfillmentRoleKey,
  templateRole?: string | null,
): { agent_key: string; name: string; role: string } | null {
  const aliases = new Set(WEBINAR_ROLE_AGENT_KEY_ALIASES[roleKey].map((k) => k.toLowerCase()))
  const roleNeedle = (templateRole || '').trim().toLowerCase()

  for (const agent of agents) {
    const key = String(agent.agent_key || '')
      .trim()
      .toLowerCase()
    if (!key) continue
    if (aliases.has(key) || key === roleKey) {
      return {
        agent_key: String(agent.agent_key),
        name: String(agent.name || key),
        role: String(agent.role || templateRole || roleKey),
      }
    }
  }

  if (roleNeedle) {
    for (const agent of agents) {
      const role = String(agent.role || '')
        .trim()
        .toLowerCase()
      if (!role) continue
      if (role === roleNeedle || role.includes(roleNeedle) || roleNeedle.includes(role)) {
        return {
          agent_key: String(agent.agent_key),
          name: String(agent.name || agent.agent_key),
          role: String(agent.role || templateRole || roleKey),
        }
      }
    }
  }

  return null
}
