import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Standard Webhooks verification as documented at developers.fathom.ai/webhooks:
 * headers `webhook-id`, `webhook-timestamp`, `webhook-signature`; signed
 * content `${id}.${timestamp}.${rawBody}`; HMAC-SHA256 with the base64 secret
 * after the `whsec_` prefix; signatures are space separated `v1,<base64>`.
 */
export const FATHOM_WEBHOOK_TOLERANCE_SECONDS = 300

export function verifyStandardWebhookSignature(input: {
  rawBody: Buffer | string
  headers: Record<string, string | undefined>
  secret: string
  nowMs?: number
  toleranceSeconds?: number
}): boolean {
  const id = input.headers['webhook-id']?.trim()
  const timestamp = input.headers['webhook-timestamp']?.trim()
  const signatureHeader = input.headers['webhook-signature']?.trim()
  if (!id || !timestamp || !signatureHeader || !input.secret) return false

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000)
  const tolerance = input.toleranceSeconds ?? FATHOM_WEBHOOK_TOLERANCE_SECONDS
  if (Math.abs(nowSeconds - timestampSeconds) > tolerance) return false

  const secretBase64 = input.secret.startsWith('whsec_') ? input.secret.slice(6) : input.secret
  const key = Buffer.from(secretBase64, 'base64')
  if (key.length === 0) return false

  const body = typeof input.rawBody === 'string' ? input.rawBody : input.rawBody.toString('utf8')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest()

  for (const part of signatureHeader.split(' ')) {
    const [version, value] = part.split(',')
    if (version !== 'v1' || !value) continue
    const candidate = Buffer.from(value, 'base64')
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return true
  }
  return false
}
