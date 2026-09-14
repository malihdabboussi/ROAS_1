import { describe, expect, it } from 'vitest'
import type { Integration, UserIntegration } from './integrations.types'
import { isPastedWebhookProvider, resolveMeetingWebhookUrl } from './meeting-webhook-url'

const KEY = 'k'.repeat(24)

function integration(provider: string): Integration {
  return { id: provider, provider, name: provider, description: '', is_active: true }
}

function row(
  provider: string,
  metadata: Record<string, unknown> = { webhook_key: KEY },
): UserIntegration {
  return { id: 'row_1', integration_id: provider, provider, status: 'connected', metadata }
}

describe('meeting-webhook-url', () => {
  it('knows which providers take a pasted address, including defined note takers', () => {
    expect(isPastedWebhookProvider('fireflies')).toBe(true)
    expect(isPastedWebhookProvider('read_ai')).toBe(true)
    expect(isPastedWebhookProvider('nt_otter')).toBe(true)
    expect(isPastedWebhookProvider('fathom')).toBe(false)
    expect(isPastedWebhookProvider('slack')).toBe(false)
  })

  it('builds the shared-door address from the connection key', () => {
    const url = resolveMeetingWebhookUrl(integration('nt_otter'), row('nt_otter'))
    expect(url).toMatch(new RegExp(`/api/integrations/meetings/webhooks/nt_otter/${KEY}$`))
    expect(resolveMeetingWebhookUrl(integration('fathom'), row('fathom'))).toBeNull()
    expect(resolveMeetingWebhookUrl(integration('nt_otter'), row('nt_otter', {}))).toBeNull()
    expect(
      resolveMeetingWebhookUrl(integration('nt_otter'), row('nt_otter', { webhook_key: 'short' })),
    ).toBeNull()
  })
})
