import { describe, expect, it } from 'vitest'
import { getAvailableIntegrations } from './integration-catalog'
import { getAdminSubscriptionDisconnectPath } from './integration-status-utils'

describe('shared integration boundary', () => {
  it('keeps admin-only subscription integrations out of the regular catalog', () => {
    const regularCatalog = getAvailableIntegrations(false)
    const adminCatalog = getAvailableIntegrations(true)

    expect(regularCatalog.some((integration) => integration.id === 'meta')).toBe(true)
    expect(regularCatalog.some((integration) => integration.id === 'openai_codex')).toBe(false)
    expect(adminCatalog.some((integration) => integration.id === 'openai_codex')).toBe(true)
    expect(adminCatalog.some((integration) => integration.id === 'anthropic_claude')).toBe(true)
  })

  it('routes admin subscription disconnects by integration id only', () => {
    expect(getAdminSubscriptionDisconnectPath('openai_codex')).toBe(
      '/api/integrations/openai-codex/disconnect',
    )
    expect(getAdminSubscriptionDisconnectPath('anthropic_claude')).toBe(
      '/api/integrations/anthropic-claude/disconnect',
    )
    expect(getAdminSubscriptionDisconnectPath('openai-codex')).toBeNull()
    expect(getAdminSubscriptionDisconnectPath('anthropic')).toBeNull()
  })
})
