import { createHmac } from 'crypto'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderContext } from '../../providers/transcript-provider.contract'
import {
  CustomWebhookTranscriptProvider,
  verifyDefinedSignature,
} from '../custom-webhook-transcript-provider'
import type { NoteTakerDefinition } from '../note-taker-definition.schema'

function definition(overrides: Partial<NoteTakerDefinition> = {}): NoteTakerDefinition {
  return {
    id: 'def_1',
    slug: 'nt_otter',
    displayName: 'Otter',
    signature: {
      scheme: 'hmac_sha256',
      header: 'X-Otter-Signature',
      encoding: 'hex',
      keyEncoding: 'utf8',
    },
    event: {
      eventTypePath: 'event',
      acceptValues: ['meeting.completed'],
      deliveryIdPath: 'delivery_id',
    },
    fieldMap: {
      externalId: 'meeting.id',
      title: 'meeting.title',
      transcript: { path: 'meeting.turns[]', text: 'text', speaker: 'speaker' },
    },
    isActive: true,
    createdBy: 'admin_1',
    createdAt: '2026-09-14T00:00:00Z',
    updatedAt: '2026-09-14T00:00:00Z',
    ...overrides,
  }
}

const body = Buffer.from(
  JSON.stringify({
    event: 'meeting.completed',
    delivery_id: 'd-1',
    meeting: { id: 'm-1', title: 'Sync', turns: [{ speaker: 'A', text: 'hello' }] },
  }),
)
const secret = 'shhh-secret'
const hex = createHmac('sha256', secret).update(body).digest('hex')
const ctx = (userId = 'user_1') => ({ userId }) as ProviderContext

describe('verifyDefinedSignature', () => {
  it('accepts a hex HMAC over the raw body, case-insensitive header name', () => {
    expect(
      verifyDefinedSignature(definition().signature, {
        rawBody: body,
        headers: { 'x-otter-signature': hex },
        secret,
      }),
    ).toBe(true)
  })

  it('rejects a wrong digest, a missing header, a tampered body and an empty key', () => {
    const sig = definition().signature
    expect(
      verifyDefinedSignature(sig, {
        rawBody: body,
        headers: { 'x-otter-signature': 'ab' },
        secret,
      }),
    ).toBe(false)
    expect(verifyDefinedSignature(sig, { rawBody: body, headers: {}, secret })).toBe(false)
    expect(
      verifyDefinedSignature(sig, {
        rawBody: Buffer.from(body.toString() + ' '),
        headers: { 'x-otter-signature': hex },
        secret,
      }),
    ).toBe(false)
    expect(
      verifyDefinedSignature(sig, {
        rawBody: body,
        headers: { 'x-otter-signature': hex },
        secret: '',
      }),
    ).toBe(false)
  })

  it('supports a prefix, base64 output and a base64-encoded key', () => {
    const key = Buffer.from('raw-key-bytes')
    const b64 = createHmac('sha256', key).update(body).digest('base64')
    const sig = {
      scheme: 'hmac_sha256' as const,
      header: 'X-Sig',
      encoding: 'base64' as const,
      prefix: 'sha256=',
      keyEncoding: 'base64' as const,
    }
    const headers = { 'x-sig': `sha256=${b64}` }
    expect(
      verifyDefinedSignature(sig, { rawBody: body, headers, secret: key.toString('base64') }),
    ).toBe(true)
    expect(
      verifyDefinedSignature(sig, {
        rawBody: body,
        headers: { 'x-sig': b64 },
        secret: key.toString('base64'),
      }),
    ).toBe(false)
  })

  it('with scheme none, passes only the internal sentinel so a real secret is never assumed', () => {
    const sig = { scheme: 'none' as const }
    expect(
      verifyDefinedSignature(sig, { rawBody: body, headers: {}, secret: 'no-signature' }),
    ).toBe(true)
    expect(
      verifyDefinedSignature(sig, { rawBody: body, headers: {}, secret: 'anything-else' }),
    ).toBe(false)
  })
})

describe('CustomWebhookTranscriptProvider', () => {
  it('describes itself from the definition', () => {
    const provider = new CustomWebhookTranscriptProvider(
      definition({ logoUrl: 'https://x/l.png' }),
      async () => null,
    )
    expect(provider.identity).toEqual({
      id: 'nt_otter',
      auth: 'signing_key',
      manifest: { displayName: 'Otter', personalOnly: true, logoKey: 'https://x/l.png' },
    })
    expect(provider.pull).toBeUndefined()
  })

  it('parses the external id, delivery id and event type through the field map', () => {
    const provider = new CustomWebhookTranscriptProvider(definition(), async () => null)
    expect(provider.push.parse(body)).toEqual({
      externalId: 'm-1',
      deliveryId: 'd-1',
      eventType: 'meeting.completed',
      inlineEvent: JSON.parse(body.toString()),
      ignore: false,
    })
  })

  it('flags events outside acceptValues as ignored and rejects bodies without an id', () => {
    const provider = new CustomWebhookTranscriptProvider(definition(), async () => null)
    const started = Buffer.from(
      JSON.stringify({ event: 'meeting.started', meeting: { id: 'm-2' } }),
    )
    expect(provider.push.parse(started)).toMatchObject({ externalId: 'm-2', ignore: true })
    expect(provider.push.parse(Buffer.from('{"event":"meeting.completed"}'))).toBeNull()
    expect(provider.push.parse(Buffer.from('not json'))).toBeNull()
    expect(provider.push.parse(Buffer.from('[1]'))).toBeNull()
  })

  it('reads the secret from the vault under the slug, or the sentinel when unsigned', async () => {
    const readSecret = vi.fn().mockResolvedValue('from-vault')
    const signed = new CustomWebhookTranscriptProvider(definition(), readSecret)
    await expect(signed.push.resolveSecret(ctx('user_9'))).resolves.toBe('from-vault')
    expect(readSecret).toHaveBeenCalledWith('user_9', 'nt_otter', 'signing_key')

    const unsigned = new CustomWebhookTranscriptProvider(
      definition({ signature: { scheme: 'none' } }),
      readSecret,
    )
    await expect(unsigned.push.resolveSecret(ctx())).resolves.toBe('no-signature')
    expect(unsigned.push.verify({ rawBody: body, headers: {}, secret: 'no-signature' })).toBe(true)
  })

  it('normalizes through the field map with the definition name attached', () => {
    const provider = new CustomWebhookTranscriptProvider(definition(), async () => null)
    const source = provider.normalize(JSON.parse(body.toString()))
    expect(source).toMatchObject({
      provider: 'nt_otter',
      providerDisplayName: 'Otter',
      externalRecordingId: 'm-1',
      title: 'Sync',
    })
    expect(source.transcript).toEqual([
      { speakerName: 'A', speakerEmail: null, timestamp: null, text: 'hello' },
    ])
  })
})
