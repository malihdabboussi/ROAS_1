import type { EntitySearchResult } from '../entity-search.types'

export function pageGraderClientMetadata(row: any): {
  clientId: string
  websiteUrl: string | null
  logoUrl: string | null
} {
  const config = (row.config ?? {}) as Record<string, any>
  const external = (config.external_sources ?? {}) as Record<string, any>
  const pageGrader = (external.page_grader ?? {}) as Record<string, any>
  const context = (row.context ?? {}) as Record<string, any>
  const profile = (config.client_profile ?? {}) as Record<string, any>
  const clientId = String(pageGrader.client_id ?? context.page_grader_client_id ?? '').trim()
  const websiteUrl = String(profile.website_url ?? config.website_url ?? '').trim() || null
  const logoUrl = String(profile.logo_url ?? config.logo_url ?? '').trim() || null
  return { clientId, websiteUrl, logoUrl }
}

export function pageGraderClientSearchResult(row: any): EntitySearchResult {
  const pageGrader = pageGraderClientMetadata(row)
  return {
    kind: 'client',
    id: pageGrader.clientId || String(row.id),
    label: row.name?.trim() || 'Untitled client',
    subtitle: pageGrader.websiteUrl || 'Client',
    iconUrl: pageGrader.logoUrl,
    url: pageGrader.clientId ? `/clients/${encodeURIComponent(pageGrader.clientId)}` : null,
    clientId: pageGrader.clientId || null,
  }
}

export function pageGraderRequestSearchResult(row: any, clientName?: string): EntitySearchResult {
  const clientId = String(row.custom_data?.page_grader_client_id ?? '')
  const status = row.status ? String(row.status).replace(/_/g, ' ') : null
  return {
    kind: 'request',
    id: row.id,
    label: row.title?.trim() || 'Untitled request',
    subtitle: [clientName, 'Request', status].filter(Boolean).join(' · '),
    iconUrl: null,
    url: `/spaces?space=${encodeURIComponent(row.space_id)}&item=${encodeURIComponent(row.id)}`,
    clientId: clientId || null,
    campaignId: row.custom_data?.page_grader_campaign_id ?? null,
  }
}
