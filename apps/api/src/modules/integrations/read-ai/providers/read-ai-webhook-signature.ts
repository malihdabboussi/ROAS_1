import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Read.ai signs each delivery with `X-Read-Signature`: the hex HMAC-SHA256 of
 * the raw request body using the webhook's signing key, which Read.ai shows
 * base64 encoded (support.read.ai "Verifying Webhook Requests").
 */
export function verifyReadAiWebhookSignature(input: {
  rawBody: Buffer | string
  headers: Record<string, string | undefined>
  secret: string
}): boolean {
  const header = input.headers['x-read-signature']?.trim()
  if (!header || !input.secret) return false
  const provided = header
    .replace(/^sha256=/i, '')
    .trim()
    .toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(provided)) return false

  const key = Buffer.from(input.secret, 'base64')
  if (key.length === 0) return false
  const body =
    typeof input.rawBody === 'string' ? Buffer.from(input.rawBody, 'utf8') : input.rawBody
  const expected = createHmac('sha256', key).update(body).digest('hex')
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
}

/** A usable signing key is base64 for at least 16 bytes. */
export function isValidReadAiSigningKey(value: string): boolean {
  const trimmed = value.trim()
  if (!/^[A-Za-z0-9+/=_-]{20,}$/.test(trimmed)) return false
  return Buffer.from(trimmed, 'base64').length >= 16
}
