import { buildPlatformWebhookUrl } from '@/lib/platform/platform-urls'
import type { Integration, UserIntegration } from './integrations.types'
import { isDefinedNoteTakerId } from './meeting-provider-definitions'

/**
 * Note takers that deliver meetings by calling ROAS at a per-connection address
 * the user pastes into the provider's own settings. The key comes from the
 * connection row (`metadata.webhook_key`), set by the API on connect (or, for
 * defined note takers, when the address is requested before connecting).
 */
const PASTED_WEBHOOK_PROVIDERS = new Set(['fireflies', 'read_ai'])

export function isPastedWebhookProvider(provider: string): boolean {
  const normalized = provider.toLowerCase()
  return PASTED_WEBHOOK_PROVIDERS.has(normalized) || isDefinedNoteTakerId(normalized)
}

export function resolveMeetingWebhookUrl(
  integration: Integration,
  userIntegration: UserIntegration,
): string | null {
  const provider = integration.provider.toLowerCase()
  if (!isPastedWebhookProvider(provider)) return null
  const key = userIntegration.metadata?.webhook_key
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return null
  return buildPlatformWebhookUrl(`/api/integrations/meetings/webhooks/${provider}/${key}`)
}
