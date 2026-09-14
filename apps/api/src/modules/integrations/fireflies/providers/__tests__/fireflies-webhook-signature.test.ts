import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { verifyFirefliesWebhookSignature } from '../fireflies-webhook-signature'

const secret = 'a-signing-secret-1234'
const body = JSON.stringify({ meetingId: 'ff_1', eventType: 'Transcription completed' })
const hex = createHmac('sha256', secret).update(body).digest('hex')
const base64 = createHmac('sha256', secret).update(body).digest('base64')

describe('verifyFirefliesWebhookSignature', () => {
  it('accepts a hex HMAC of the raw body', () => {
    expect(
      verifyFirefliesWebhookSignature({
        rawBody: Buffer.from(body),
        headers: { 'x-hub-signature': hex },
        secret,
      }),
    ).toBe(true)
  })

  it('accepts the sha256= prefixed form and uppercase hex', () => {
    expect(
      verifyFirefliesWebhookSignature({
        rawBody: Buffer.from(body),
        headers: { 'x-hub-signature': `sha256=${hex.toUpperCase()}` },
        secret,
      }),
    ).toBe(true)
  })

  it('accepts a base64 digest', () => {
    expect(
      verifyFirefliesWebhookSignature({
        rawBody: Buffer.from(body),
        headers: { 'x-hub-signature': base64 },
        secret,
      }),
    ).toBe(true)
  })

  it('rejects a tampered body, a wrong secret, and a missing header', () => {
    expect(
      verifyFirefliesWebhookSignature({
        rawBody: Buffer.from(body.replace('ff_1', 'ff_2')),
        headers: { 'x-hub-signature': hex },
        secret,
      }),
    ).toBe(false)
    expect(
      verifyFirefliesWebhookSignature({
        rawBody: Buffer.from(body),
        headers: { 'x-hub-signature': hex },
        secret: 'other-secret-12345678',
      }),
    ).toBe(false)
    expect(
      verifyFirefliesWebhookSignature({ rawBody: Buffer.from(body), headers: {}, secret }),
    ).toBe(false)
  })
})
