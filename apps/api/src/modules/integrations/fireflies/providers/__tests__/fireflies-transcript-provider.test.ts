import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderContext } from '../../../../meetings/providers/transcript-provider.contract'
import { FirefliesTranscriptProvider } from '../fireflies-transcript-provider'

const transcript = {
  id: 'ff_1',
  title: 'Pricing sync',
  date: 1_760_000_000_000,
  duration: 10,
  sentences: [{ speaker_name: 'Host', text: 'Welcome', start_time: 0, end_time: 1 }],
}

describe('FirefliesTranscriptProvider', () => {
  let registry: { register: ReturnType<typeof vi.fn> }
  let api: { getTranscript: ReturnType<typeof vi.fn>; listTranscripts: ReturnType<typeof vi.fn> }
  let vault: { getSecret: ReturnType<typeof vi.fn> }
  let provider: FirefliesTranscriptProvider
  let ctx: ProviderContext

  beforeEach(() => {
    registry = { register: vi.fn() }
    api = {
      getTranscript: vi.fn().mockResolvedValue(transcript),
      listTranscripts: vi.fn().mockResolvedValue([]),
    }
    vault = { getSecret: vi.fn().mockResolvedValue('a-signing-secret-1234') }
    provider = new FirefliesTranscriptProvider(registry as never, api as never, vault as never)
    ctx = {
      supabase: {} as never,
      userId: 'user_1',
      orgId: null,
      connection: {
        id: 'conn_1',
        userId: 'user_1',
        orgId: null,
        provider: 'fireflies',
        status: 'connected',
        metadata: {},
      },
    }
  })

  it('registers itself as an API-key provider with push and pull', () => {
    provider.onModuleInit()
    expect(registry.register).toHaveBeenCalledWith(provider)
    expect(provider.identity).toEqual(expect.objectContaining({ id: 'fireflies', auth: 'api_key' }))
  })

  it('parses the Transcription completed ping into a meeting id with no inline event', () => {
    const body = Buffer.from(
      JSON.stringify({
        meetingId: 'ff_1',
        eventType: 'Transcription completed',
        clientReferenceId: 'x',
      }),
    )
    expect(provider.push.parse(body, {})).toEqual({
      externalId: 'ff_1',
      deliveryId: null,
      eventType: 'Transcription completed',
      inlineEvent: null,
    })
    expect(provider.push.parse(Buffer.from('{}'), {})).toBeNull()
    expect(provider.push.parse(Buffer.from('nope'), {})).toBeNull()
  })

  it('reads the webhook secret from the vault', async () => {
    await expect(provider.push.resolveSecret(ctx)).resolves.toBe('a-signing-secret-1234')
    expect(vault.getSecret).toHaveBeenCalledWith('user_1', 'fireflies', 'webhook_secret')
  })

  it('fetches the full transcript through the API and normalizes it', async () => {
    const source = await provider.pull.fetch(ctx, 'ff_1', null)
    expect(api.getTranscript).toHaveBeenCalledWith('user_1', 'ff_1')
    expect(source.provider).toBe('fireflies')
    expect(source.externalRecordingId).toBe('ff_1')
    expect(source.transcript).toEqual([
      { speakerName: 'Host', speakerEmail: null, timestamp: '00:00', text: 'Welcome' },
    ])
  })

  it('uses an inline transcript when it already carries sentences', async () => {
    const source = await provider.pull.fetch(ctx, 'ff_1', transcript)
    expect(api.getTranscript).not.toHaveBeenCalled()
    expect(source.title).toBe('Pricing sync')
  })

  it('lists recent transcripts with a numeric skip cursor', async () => {
    api.listTranscripts.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({ id: `ff_${i}`, title: `Call ${i}`, date: 1 })),
    )
    const page = await provider.pull.listRecent(ctx, '20')
    expect(api.listTranscripts).toHaveBeenCalledWith('user_1', { limit: 20, skip: 20 })
    expect(page.items[0]).toEqual(expect.objectContaining({ externalId: 'ff_0', title: 'Call 0' }))
    expect(page.nextCursor).toBe('40')

    api.listTranscripts.mockResolvedValue([{ id: 'ff_x', title: 'Last', date: 1 }])
    await expect(provider.pull.listRecent(ctx)).resolves.toMatchObject({ nextCursor: null })
  })
})
