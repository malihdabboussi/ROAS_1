import type { SocialConnectionOption } from '@/lib/reporting/social-analytics-types'

export function resolveSocialReportingUserIntegrationId(
  effectiveConnectionId: string | null,
  platformOpts: SocialConnectionOption[],
  activeConnectionId?: string | null,
  activeConnectionSource?: 'campaign_integration' | 'user_integration' | null,
): string | null {
  if (effectiveConnectionId) {
    const hit = platformOpts.find((o) => o.id === effectiveConnectionId)
    if (hit?.source === 'user_integration') return hit.id
  }
  if (activeConnectionSource === 'user_integration' && activeConnectionId) return activeConnectionId
  const userRow = platformOpts.find((o) => o.source === 'user_integration')
  return userRow?.id ?? null
}
