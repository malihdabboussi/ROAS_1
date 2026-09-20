import { createHmac } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomWebhookTranscriptProvider } from '../../../custom/custom-webhook-transcript-provider'
import type { NoteTakerDefinition } from '../../../custom/note-taker-definition.schema'
import { MeetingProviderRegistry } from '../../../providers/meeting-provider.registry'
import type { MeetingConnection } from '../../../providers/transcript-provider.contract'
import { MeetingIntakeService } from '../meeting-intake.service'

const KEY = 'k'.repeat(24)
const SECRET = 'otter-signing-secret'

const definition: NoteTakerDefinition = {
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
    hostEmail: 'meeting.host',
    transcript: { path: 'meeting.turns[]', speaker: 'speaker', text: 'text' },
    actions: { path: 'meeting.todos[]', text: 'text' },
  },
  isActive: true,
  createdBy: 'admin_1',
  createdAt: '',
  updatedAt: '',
}

const completed = {
  event: 'meeting.completed',
  delivery_id: 'd-1',
  meeting: {
    id: 'm-1',
    title: 'Otter sync',
    host: 'host@example.com',
    turns: [{ speaker: 'Host', text: 'Decision made' }],
    todos: [{ text: 'Follow up' }],
  },
}

function connection(): MeetingConnection {
  return {
    id: 'conn_1',
    userId: 'user_1',
    orgId: null,
    provider: 'nt_otter',
    status: 'connected',
    metadata: { webhook_key: KEY, auto_ingest: true },
  }
}

/** The door with a definition-backed provider behind the registry, everything else mocked. */
describe('MeetingIntakeService with a note taker defined from Settings', () => {
  let service: MeetingIntakeService
  let repository: Record<string, ReturnType<typeof vi.fn>>
  let deliveries: { claim: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> }
  let importJobs: { enqueueMeetingTranscriptImport: ReturnType<typeof vi.fn> }
  let spaceAutomation: { processFathomRecordingEvent: ReturnType<typeof vi.fn> }
  let vaultSecret: string | null

  beforeEach(() => {
    vaultSecret = SECRET
    const registry = new MeetingProviderRegistry()
    registry.registerResolver({
      resolve: async (id) =>
        id === 'nt_otter'
          ? new CustomWebhookTranscriptProvider(definition, async () => vaultSecret)
          : null,
      listCapabilities: async () => [],
    })
    repository = {
      getServiceClient: vi.fn(() => ({})),
      findConnectionByWebhookKey: vi.fn().mockResolvedValue(connection()),
      findConnectionForUser: vi.fn().mockResolvedValue(connection()),
      findActiveOrgMemberRole: vi.fn().mockResolvedValue(null),
      enqueueBrainOpsOutboxRows: vi.fn().mockResolvedValue(undefined),
    }
    deliveries = {
      claim: vi.fn().mockResolvedValue({ claimed: true, id: 'del_1' }),
      release: vi.fn().mockResolvedValue(undefined),
    }
    importJobs = {
      enqueueMeetingTranscriptImport: vi
        .fn()
        .mockResolvedValue({ jobId: 'job-1', status: 'queued' }),
    }
    spaceAutomation = {
      processFathomRecordingEvent: vi
        .fn()
        .mockResolvedValue({ processed: true, item_id: 'item_1' }),
    }
    service = new MeetingIntakeService(
      registry,
      repository as never,
      deliveries as never,
      importJobs as never,
      { listEnabledCustomerBrainsForRouting: vi.fn().mockResolvedValue([]) } as never,
      spaceAutomation as never,
    )
  })

  const post = (body: unknown, sign = true, provider = 'nt_otter') => {
    const rawBody = Buffer.from(JSON.stringify(body))
    const headers: Record<string, string> = {}
    if (sign)
      headers['x-otter-signature'] = createHmac('sha256', SECRET).update(rawBody).digest('hex')
    return service.handleWebhook({ provider, connectionKey: KEY, rawBody, headers })
  }

  it('accepts a signed delivery and fans it out with the real provider id and name', async () => {
    const result = await post(completed)
    expect(result.status).toBe(202)
    expect(deliveries.claim).toHaveBeenCalledWith({
      provider: 'nt_otter',
      connectionId: 'conn_1',
      deliveryId: 'd-1',
      externalId: 'm-1',
    })
    const [userId, input] = importJobs.enqueueMeetingTranscriptImport.mock.calls[0]!
    expect(userId).toBe('user_1')
    expect(input.source).toMatchObject({
      provider: 'nt_otter',
      providerDisplayName: 'Otter',
      externalRecordingId: 'm-1',
      title: 'Otter sync',
    })
    expect(input.source.transcript).toEqual([
      { speakerName: 'Host', speakerEmail: null, timestamp: null, text: 'Decision made' },
    ])
    const event = spaceAutomation.processFathomRecordingEvent.mock.calls[0]![2]
    expect(event).toMatchObject({ provider: 'nt_otter', id: 'm-1', title: 'Otter sync' })
  })

  it('rejects an unsigned delivery, and one whose secret is missing from the vault', async () => {
    await expect(post(completed, false)).resolves.toMatchObject({ status: 401 })
    vaultSecret = null
    await expect(post(completed)).resolves.toMatchObject({ status: 401 })
    expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
  })

  it('acknowledges events the definition does not accept without processing them', async () => {
    const started = { ...completed, event: 'meeting.started' }
    await expect(post(started)).resolves.toMatchObject({
      status: 200,
      body: { status: 'ignored', eventType: 'meeting.started' },
    })
    expect(deliveries.claim).not.toHaveBeenCalled()
  })

  it('404s slugs with no active definition and ids that are not note takers', async () => {
    await expect(post(completed, true, 'nt_unknown')).resolves.toMatchObject({ status: 404 })
    await expect(post(completed, true, 'NT_otter')).resolves.toMatchObject({ status: 404 })
    expect(repository.findConnectionByWebhookKey).not.toHaveBeenCalled()
  })
})
