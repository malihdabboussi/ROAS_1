import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Fireflies signs each delivery with `x-hub-signature`: an HMAC-SHA256 of the
 * raw request body using the secret the user set in Fireflies Developer
 * settings (docs.fireflies.ai/graphql-api/webhooks). The docs do not state the
 * digest encoding, so hex and base64 are both accepted, with or without a
 * `sha256=` prefix.
 */
export function verifyFirefliesWebhookSignature(input: {
  rawBody: Buffer | string
  headers: Record<string, string | undefined>
  secret: string
}): boolean {
  const header = input.headers['x-hub-signature']?.trim()
  if (!header || !input.secret) return false
  const provided = header.replace(/^sha256=/i, '').trim()
  if (!provided) return false

  const body =
    typeof input.rawBody === 'string' ? Buffer.from(input.rawBody, 'utf8') : input.rawBody
  const digest = createHmac('sha256', input.secret).update(body).digest()
  const candidates = [digest.toString('hex'), digest.toString('base64')]
  const providedLower = provided.toLowerCase()

  for (const candidate of candidates) {
    const expected = Buffer.from(candidate)
    const actual = Buffer.from(candidate === digest.toString('hex') ? providedLower : provided)
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) return true
  }
  return false
}
