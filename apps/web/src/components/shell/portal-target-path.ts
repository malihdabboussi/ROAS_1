const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function asPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

function asUuid(value: unknown): string | null {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null
}

function spaceCustomData(space: { schema?: unknown } | null | undefined): Record<string, unknown> {
  if (!space?.schema || typeof space.schema !== 'object') return {}
  const customData = (space.schema as { custom_data?: unknown }).custom_data
  if (!customData || typeof customData !== 'object' || Array.isArray(customData)) return {}
  return customData as Record<string, unknown>
}

function pathFromSpace(space: { schema?: unknown } | null | undefined): string | null {
  const data = spaceCustomData(space)
  const campaignId = asUuid(data.page_grader_campaign_id)
  if (campaignId) return `/campaigns/${campaignId}`
  const clientId = asUuid(data.page_grader_client_id)
  if (clientId) return `/clients/${clientId}`
  return null
}

/**
 * Page Grader path to open in Portal for the current ROAS route.
 * ROAS `/campaigns/:id` ids are not Page Grader campaign ids — never pass them through.
 */
export function portalTargetPathFromRoute(input: {
  pathname: string
  portalPath?: string | null
  space?: { schema?: unknown } | null
}): string {
  const explicit = asPath(input.portalPath)
  if (explicit) return explicit

  if (input.pathname.startsWith('/clients/')) {
    const clientId = asUuid(input.pathname.slice('/clients/'.length).split('/')[0])
    if (clientId) return `/clients/${clientId}`
  }
  if (input.pathname === '/clients' || input.pathname.startsWith('/clients/')) return '/clients'
  if (input.pathname.startsWith('/client-campaigns')) return '/campaigns'

  const fromSpace = pathFromSpace(input.space)
  if (
    fromSpace &&
    (input.pathname.startsWith('/spaces') || input.pathname.startsWith('/campaigns'))
  ) {
    return fromSpace
  }

  return '/clients'
}
