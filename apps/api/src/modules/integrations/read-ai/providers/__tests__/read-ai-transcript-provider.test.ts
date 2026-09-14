import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderContext } from '../../../../meetings/providers/transcript-provider.contract'
import { ReadAiTranscriptProvider } from '../read-ai-transcript-provider'

describe('ReadAiTranscriptProvider', () => {
  let registry: { register: ReturnType<typeof vi.fn> }
  let vault: { getSecret: ReturnType<typeof vi.fn> }
  let provider: ReadAiTranscriptProvider
  let ctx: ProviderContext

  beforeEach(() => {
    registry = { register: vi.fn() }
    vault = { getSecret: vi.fn().mockResolvedValue('c2lnbmluZy1rZXktc2lnbmluZy1rZXk=') }
    provider = new ReadAiTranscriptProvider(registry as never, vault as never)
    ctx = {
      supabase: {} as never,
      userId: 'user_1',
      orgId: null,
      connection: {
        id: 'conn_1',
        userId: 'user_1',
        orgId: null,
        provider: 'read_ai',
        status: 'connected',
        metadata: {},
      },
    }
  })

  it('registers as a webhook-only provider with no pull capability', () => {
    provider.onModuleInit()
    expect(registry.register).toHaveBeenCalledWith(provider)
    expect(provider.identity).toEqual(
      expect.objectContaining({ id: 'read_ai', auth: 'signing_key' }),
    )
    expect((provider as { pull?: unknown }).pull).toBeUndefined()
  })

  it('parses a meeting_end delivery with the session id, request id and inline report', () => {
    const body = Buffer.from(
      JSON.stringify({
        session_id: 'S1',
        trigger: 'meeting_end',
        request_id: 'req_1',
        title: 'Call',
      }),
    )
    expect(provider.push.parse(body, {})).toEqual({
      externalId: 'S1',
      deliveryId: 'req_1',
      eventType: 'meeting_end',
      inlineEvent: expect.objectContaining({ session_id: 'S1', title: 'Call' }),
      ignore: false,
    })
  })

  it('marks meeting_start deliveries as ignorable and refuses bodies without a session id', () => {
    const start = Buffer.from(JSON.stringify({ session_id: 'S1', trigger: 'meeting_start' }))
    expect(provider.push.parse(start, {})).toMatchObject({
      eventType: 'meeting_start',
      ignore: true,
    })
    expect(provider.push.parse(Buffer.from(JSON.stringify({ title: 'x' })), {})).toBeNull()
    expect(provider.push.parse(Buffer.from('nope'), {})).toBeNull()
  })

  it('reads the signing key from the vault', async () => {
    await expect(provider.push.resolveSecret(ctx)).resolves.toBe('c2lnbmluZy1rZXktc2lnbmluZy1rZXk=')
    expect(vault.getSecret).toHaveBeenCalledWith('user_1', 'read_ai', 'signing_key')
  })

  it('normalizes the inline report', () => {
    const source = provider.normalize({
      session_id: 'S1',
      title: 'Call',
      transcript: { speaker_blocks: [{ speaker: { name: 'A' }, words: 'hello' }] },
    })
    expect(source.provider).toBe('read_ai')
    expect(source.transcript).toHaveLength(1)
  })
})
