import type { Integration } from './integrations.types'

/**
 * Library / Add-connection gate: inactive catalog rows are Coming Soon.
 * Meta stays active in the catalog but is gated by billing/role eligibility.
 */
export function isIntegrationsLibraryComingSoon(
  integration: Pick<Integration, 'provider' | 'is_active'>,
  options?: { metaEligible?: boolean },
): boolean {
  if (!integration.is_active) return true
  if (integration.provider.toLowerCase() === 'meta' && options?.metaEligible === false) {
    return true
  }
  return false
}
