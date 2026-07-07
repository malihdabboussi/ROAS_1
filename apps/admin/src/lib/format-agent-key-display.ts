/** Matches gateway ids from AgentRuntimeService.resolveGatewayAgentId. */
const ORG_GATEWAY_AGENT_RE =
  /^org[-:]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[-:](.+)$/i

function formatSlugLabel(slug: string): string {
  return slug
    .split('_')
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join(' ')
}

/** e.g. `org-…-vibey` → "Vibey (Org)", `vibey` → "Vibey (Personal)" */
export function formatAgentKeyDisplay(raw: string | null | undefined): string {
  const s = raw?.trim()
  if (!s) return '—'
  const m = ORG_GATEWAY_AGENT_RE.exec(s)
  if (m) {
    return `${formatSlugLabel(m[2] ?? s)} (Org)`
  }
  return `${formatSlugLabel(s)} (Personal)`
}
