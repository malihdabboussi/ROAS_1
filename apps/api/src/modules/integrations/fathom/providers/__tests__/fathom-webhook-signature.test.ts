import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { verifyStandardWebhookSignature } from '../fathom-webhook-signature'

const secretBase64 = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
const secret = `whsec_${secretBase64}`
const body = JSON.stringify({ recording_id: 'rec_1', title: 'Strategy call' })
const nowMs = 1_760_000_000_000
const timestamp = String(Math.floor(nowMs / 1000))

function sign(id: string, ts: string, payload: string, key = secret): string {
  const raw = Buffer.from(key.replace(/^whsec_/, ''), 'base64')
  return `v1,${createHmac('sha256', raw).update(`${id}.${ts}.${payload}`).digest('base64')}`
}

function headers(overrides: Record<string, string | undefined> = {}) {
  return {
    'webhook-id': 'msg_1',
    'webhook-timestamp': timestamp,
    'webhook-signature': sign('msg_1', timestamp, body),
    ...overrides,
  }
}

describe('verifyStandardWebhookSignature', () => {
  it('accepts a delivery signed with the connection secret', () => {
    expect(
      verifyStandardWebhookSignature({
        rawBody: Buffer.from(body),
        headers: headers(),
        secret,
        nowMs,
      }),
    ).toBe(true)
  })

  it('accepts the secret without the whsec_ prefix', () => {
    expect(
      verifyStandardWebhookSignature({
        rawBody: Buffer.from(body),
        headers: headers(),
        secret: secretBase64,
        nowMs,
      }),
    ).toBe(true)
  })

  it('rejects a tampered body', () => {
    const tampered = body.replace('Strategy call', 'Tampered')
    expect(
      verifyStandardWebhookSignature({
        rawBody: Buffer.from(tampered),
        headers: headers(),
        secret,
        nowMs,
      }),
    ).toBe(false)
  })

  it('rejects a signature made with another secret', () => {
    const other = `whsec_${Buffer.from('ffffffffffffffffffffffffffffffff').toString('base64')}`
    expect(
      verifyStandardWebhookSignature({
        rawBody: Buffer.from(body),
        headers: headers({ 'webhook-signature': sign('msg_1', timestamp, body, other) }),
        secret,
        nowMs,
      }),
    ).toBe(false)
  })

  it('rejects a stale timestamp (replay outside the five minute window)', () => {
    const stale = String(Math.floor(nowMs / 1000) - 600)
    expect(
      verifyStandardWebhookSignature({
        rawBody: Buffer.from(body),
        headers: headers({
          'webhook-timestamp': stale,
          'webhook-signature': sign('msg_1', stale, body),
        }),
        secret,
        nowMs,
      }),
    ).toBe(false)
  })

  it('rejects when any header is missing', () => {
    expect(
      verifyStandardWebhookSignature({
        rawBody: Buffer.from(body),
        headers: headers({ 'webhook-signature': undefined }),
        secret,
        nowMs,
      }),
    ).toBe(false)
    expect(
      verifyStandardWebhookSignature({
        rawBody: Buffer.from(body),
        headers: headers({ 'webhook-id': undefined }),
        secret,
        nowMs,
      }),
    ).toBe(false)
    expect(
      verifyStandardWebhookSignature({
        rawBody: Buffer.from(body),
        headers: headers(),
        secret: '',
        nowMs,
      }),
    ).toBe(false)
  })

  it('accepts when one of several space separated signatures matches', () => {
    const good = sign('msg_1', timestamp, body)
    expect(
      verifyStandardWebhookSignature({
        rawBody: Buffer.from(body),
        headers: headers({ 'webhook-signature': `v1,AAAA ${good}` }),
        secret,
        nowMs,
      }),
    ).toBe(true)
  })
})
