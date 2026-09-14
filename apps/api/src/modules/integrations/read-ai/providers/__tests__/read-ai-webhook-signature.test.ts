import { createHmac, randomBytes } from 'crypto'
import { describe, expect, it } from 'vitest'
import { isValidReadAiSigningKey, verifyReadAiWebhookSignature } from '../read-ai-webhook-signature'

const secret = randomBytes(32).toString('base64')
const body = JSON.stringify({ session_id: 'SESSIONID', trigger: 'meeting_end' })
const signature = createHmac('sha256', Buffer.from(secret, 'base64')).update(body).digest('hex')

describe('verifyReadAiWebhookSignature', () => {
  it('accepts the documented hex HMAC of the raw body with the base64 signing key', () => {
    expect(
      verifyReadAiWebhookSignature({
        rawBody: Buffer.from(body),
        headers: { 'x-read-signature': signature.toUpperCase() },
        secret,
      }),
    ).toBe(true)
  })

  it('rejects a tampered body, a different key, a malformed header and a missing header', () => {
    expect(
      verifyReadAiWebhookSignature({
        rawBody: Buffer.from(body.replace('meeting_end', 'meeting_start')),
        headers: { 'x-read-signature': signature },
        secret,
      }),
    ).toBe(false)
    expect(
      verifyReadAiWebhookSignature({
        rawBody: Buffer.from(body),
        headers: { 'x-read-signature': signature },
        secret: randomBytes(32).toString('base64'),
      }),
    ).toBe(false)
    expect(
      verifyReadAiWebhookSignature({
        rawBody: Buffer.from(body),
        headers: { 'x-read-signature': 'not-hex' },
        secret,
      }),
    ).toBe(false)
    expect(verifyReadAiWebhookSignature({ rawBody: Buffer.from(body), headers: {}, secret })).toBe(
      false,
    )
  })
})

describe('isValidReadAiSigningKey', () => {
  it('accepts base64 keys of at least 16 bytes and rejects short or malformed values', () => {
    expect(isValidReadAiSigningKey(secret)).toBe(true)
    expect(isValidReadAiSigningKey('GHx4YT/StkcArjYPypjFG48FbZvgzBuDBOz5pCecbro=')).toBe(true)
    expect(isValidReadAiSigningKey('short')).toBe(false)
    expect(isValidReadAiSigningKey('!!! not base64 at all !!!!!!!')).toBe(false)
  })
})
