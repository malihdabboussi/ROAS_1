import { describe, expect, it } from 'vitest'
import { getAvailableIntegrations } from './integration-catalog'
import { isIntegrationsLibraryComingSoon } from './is-integrations-library-coming-soon'

describe('isIntegrationsLibraryComingSoon', () => {
  it('marks inactive catalog rows as coming soon', () => {
    expect(isIntegrationsLibraryComingSoon({ provider: 'gmail', is_active: false })).toBe(true)
  })

  it('keeps active rows connectable unless Meta eligibility blocks them', () => {
    expect(isIntegrationsLibraryComingSoon({ provider: 'outlook', is_active: true })).toBe(false)
    expect(
      isIntegrationsLibraryComingSoon(
        { provider: 'meta', is_active: true },
        { metaEligible: false },
      ),
    ).toBe(true)
    expect(
      isIntegrationsLibraryComingSoon(
        { provider: 'meta', is_active: true },
        { metaEligible: true },
      ),
    ).toBe(false)
  })
})

describe('integration catalog connectability', () => {
  it('keeps unconfigured Library providers inactive so Connect is not offered', () => {
    const catalog = getAvailableIntegrations(false)
    const byId = new Map(catalog.map((item) => [item.id, item]))

    for (const id of [
      'gmail',
      'facebook',
      'reddit',
      'google_ads',
      'google_analytics',
      'google_search_console',
      'mailchimp',
      'kit',
      'whop',
      'google_docs',
      'clickup',
      'vercel',
      'twitter',
      'tiktok',
    ]) {
      expect(byId.get(id)?.is_active, id).toBe(false)
    }

    for (const id of [
      'outlook',
      'google_calendar',
      'google_drive',
      'linkedin',
      'slack',
      'page_grader',
    ]) {
      expect(byId.get(id)?.is_active, id).toBe(true)
    }
  })
})
