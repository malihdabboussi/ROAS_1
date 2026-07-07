import { describe, expect, it } from 'vitest'
import { getAdminSubscriptionDisconnectPath } from './useIntegrations'

describe('getAdminSubscriptionDisconnectPath', () => {
  it('routes admin subscription integrations by integration id', () => {
    expect(getAdminSubscriptionDisconnectPath('openai_codex')).toBe(
      '/api/integrations/openai-codex/disconnect',
    )
    expect(getAdminSubscriptionDisconnectPath('anthropic_claude')).toBe(
      '/api/integrations/anthropic-claude/disconnect',
    )
  })

  it('does not route by runtime provider name', () => {
    expect(getAdminSubscriptionDisconnectPath('openai-codex')).toBeNull()
    expect(getAdminSubscriptionDisconnectPath('anthropic')).toBeNull()
  })
})
