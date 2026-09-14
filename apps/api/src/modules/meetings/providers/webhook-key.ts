import { randomBytes } from 'crypto'

/** Per-connection secret path segment that identifies which connection a webhook belongs to. */
export const WEBHOOK_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

export function generateWebhookKey(): string {
  return randomBytes(24).toString('base64url')
}

export function readWebhookKey(metadata: Record<string, unknown>): string | null {
  const value = metadata.webhook_key
  return typeof value === 'string' && WEBHOOK_KEY_PATTERN.test(value) ? value : null
}

export function buildMeetingWebhookPath(provider: string, webhookKey: string): string {
  return `/api/integrations/meetings/webhooks/${provider}/${webhookKey}`
}
