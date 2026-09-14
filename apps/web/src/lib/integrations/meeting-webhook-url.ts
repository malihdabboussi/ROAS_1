import { buildPlatformWebhookUrl } from '@/lib/platform/platform-urls'
import type { Integration, UserIntegration } from './integrations.types'

/**
 * Note takers that deliver meetings by calling ROAS at a per-connection address
 * the user pastes into the provider's own settings. The key comes from the
 * connection row (`metadata.webhook_key`), set by the API on connect.
 */
const PASTED_WEBHOOK_PROVIDERS = new Set(['fireflies', 'read_ai'])

export function resolveMeetingWebhookUrl(
  integration: Integration,
  userIntegration: UserIntegration,
): string | null {
  const provider = integration.provider.toLowerCase()
  if (!PASTED_WEBHOOK_PROVIDERS.has(provider)) return null
  const key = userIntegration.metadata?.webhook_key
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return null
  return buildPlatformWebhookUrl(`/api/integrations/meetings/webhooks/${provider}/${key}`)
}
