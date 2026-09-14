import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeFathomMeetingSource } from '../../../providers/fathom-meeting-source'
import type {
  MeetingConnection,
  TranscriptProvider,
} from '../../../providers/transcript-provider.contract'
import { MeetingIntakeService } from '../meeting-intake.service'

const KEY = 'k'.repeat(24)

function connection(overrides: Partial<MeetingConnection> = {}): MeetingConnection {
  return {
    id: 'conn_1',
    userId: 'user_1',
    orgId: null,
    provider: 'fathom',
    status: 'connected',
    metadata: { webhook_secret: 'secret', webhook_key: KEY, auto_ingest: true },
    ...overrides,
  }
}

const transcriptEvent = {
  id: 'meeting_1',
  title: 'Strategy call',
  recorded_by: { email: 'host@example.com' },
  transcript: [{ speaker: { display_name: 'Host' }, text: 'Important decision', timestamp: '1' }],
  default_summary: { markdown_formatted: 'summary text' },
  action_items: [{ description: 'Do next step' }],
}

describe('MeetingIntakeService', () => {
  let registry: { get: ReturnType<typeof vi.fn>; require: ReturnType<typeof vi.fn> }
  let repository: Record<string, ReturnType<typeof vi.fn>>
  let deliveries: { claim: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> }
  let importJobs: { enqueueMeetingTranscriptImport: ReturnType<typeof vi.fn> }
  let customerBrain: { listEnabledCustomerBrainsForRouting: ReturnType<typeof vi.fn> }
  let spaceAutomation: { processFathomRecordingEvent: ReturnType<typeof vi.fn> }
  let provider: TranscriptProvider & {
    hooks: { beforeIntake: ReturnType<typeof vi.fn>; afterSpaceRoute: ReturnType<typeof vi.fn> }
  }
  let service: MeetingIntakeService
  const admin = { tag: 'admin' }

  beforeEach(() => {
    provider = {
      identity: {
        id: 'fathom',
        auth: 'oauth2',
        manifest: { displayName: 'Fathom', personalOnly: true, logoKey: 'fathom' },
      },
      push: {
        verify: ({ headers }) => headers['x-ok'] === '1',
        parse: (rawBody, headers) => {
          const event = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>
          if (!event.id) return null
          return {
            externalId: String(event.id),
            deliveryId: headers['x-delivery'] ?? null,
            eventType: 'recording_ready',
            inlineEvent: event,
          }
        },
        resolveSecret: async (ctx) =>
          typeof ctx.connection.metadata.webhook_secret === 'string'
            ? ctx.connection.metadata.webhook_secret
            : null,
      },
      pull: { fetch: async (_ctx, _id, inline) => normalizeFathomMeetingSource(inline ?? {}) },
      normalize: normalizeFathomMeetingSource,
      hooks: {
        beforeIntake: vi.fn().mockResolvedValue({ proceed: true }),
        afterSpaceRoute: vi.fn().mockResolvedValue(undefined),
      },
    }
    registry = { get: vi.fn(() => provider), require: vi.fn(() => provider) }
    repository = {
      getServiceClient: vi.fn(() => admin),
      findConnectionByWebhookKey: vi.fn().mockResolvedValue(connection()),
      findConnectionForUser: vi.fn().mockResolvedValue(connection()),
      findActiveOrgMemberRole: vi.fn().mockResolvedValue('admin'),
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
    customerBrain = { listEnabledCustomerBrainsForRouting: vi.fn().mockResolvedValue([]) }
    spaceAutomation = {
      processFathomRecordingEvent: vi
        .fn()
        .mockResolvedValue({ processed: true, space_id: 'space_1', item_id: 'item_1' }),
    }
    service = new MeetingIntakeService(
      registry as never,
      repository as never,
      deliveries as never,
      importJobs as never,
      customerBrain as never,
      spaceAutomation as never,
    )
  })

  const webhook = (
    body: unknown,
    headers: Record<string, string | undefined> = { 'x-ok': '1', 'x-delivery': 'd1' },
    overrides: { provider?: string; connectionKey?: string } = {},
  ) =>
    service.handleWebhook({
      provider: overrides.provider ?? 'fathom',
      connectionKey: overrides.connectionKey ?? KEY,
      rawBody: Buffer.from(JSON.stringify(body)),
      headers,
    })

  describe('handleWebhook', () => {
    it('answers 404 for an unknown provider, a malformed key, or an unknown connection', async () => {
      await expect(
        webhook(transcriptEvent, undefined, { provider: 'zoom' }),
      ).resolves.toMatchObject({
        status: 404,
      })
      await expect(
        webhook(transcriptEvent, undefined, { connectionKey: 'short' }),
      ).resolves.toMatchObject({
        status: 404,
      })
      repository.findConnectionByWebhookKey.mockResolvedValue(null)
      await expect(webhook(transcriptEvent)).resolves.toMatchObject({ status: 404 })
      expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
    })

    it('answers 401 when the provider signature check fails and processes nothing', async () => {
      await expect(webhook(transcriptEvent, { 'x-ok': '0' })).resolves.toMatchObject({
        status: 401,
      })
      expect(deliveries.claim).not.toHaveBeenCalled()
      expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
    })

    it('answers 400 when the body cannot be parsed into a meeting', async () => {
      await expect(webhook({ title: 'no id' })).resolves.toMatchObject({ status: 400 })
    })

    it('answers 200 duplicate for a replayed delivery without processing it again', async () => {
      deliveries.claim.mockResolvedValue({ claimed: false })
      await expect(webhook(transcriptEvent)).resolves.toEqual({
        status: 200,
        body: { success: true, status: 'duplicate' },
      })
      expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
    })

    it('claims the delivery, fans the meeting out, and answers 202', async () => {
      const result = await webhook(transcriptEvent)
      expect(deliveries.claim).toHaveBeenCalledWith({
        provider: 'fathom',
        connectionId: 'conn_1',
        deliveryId: 'd1',
        externalId: 'meeting_1',
      })
      expect(result.status).toBe(202)
      expect(result.body).toMatchObject({ success: true, status: 'processed', brainJobId: 'job-1' })
      expect(importJobs.enqueueMeetingTranscriptImport).toHaveBeenCalledWith(
        'user_1',
        {
          source: expect.objectContaining({
            provider: 'fathom',
            externalRecordingId: 'meeting_1',
            title: 'Strategy call',
            transcript: [expect.objectContaining({ text: 'Important decision' })],
          }),
        },
        null,
      )
      const jobSource = importJobs.enqueueMeetingTranscriptImport.mock.calls[0]![1].source
      expect(jobSource).not.toHaveProperty('raw')
      expect(spaceAutomation.processFathomRecordingEvent).toHaveBeenCalledWith(
        admin,
        'user_1',
        expect.objectContaining({ id: 'meeting_1' }),
      )
    })

    it('falls back to event type plus external id as the delivery id when the provider has none', async () => {
      await webhook(transcriptEvent, { 'x-ok': '1' })
      expect(deliveries.claim).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryId: 'recording_ready:meeting_1' }),
      )
    })

    it('releases the claim and answers 500 when processing throws, so the provider retries', async () => {
      importJobs.enqueueMeetingTranscriptImport.mockRejectedValue(new Error('queue down'))
      await expect(webhook(transcriptEvent)).resolves.toMatchObject({ status: 500 })
      expect(deliveries.release).toHaveBeenCalledWith('del_1')
    })
  })

  describe('intake', () => {
    it('skips everything when auto-ingest is off', async () => {
      repository.findConnectionForUser.mockResolvedValue(
        connection({ metadata: { auto_ingest: false } }),
      )
      await expect(
        service.intakeForUser({
          provider: 'fathom',
          userId: 'user_1',
          externalId: 'meeting_1',
          inlineEvent: transcriptEvent,
        }),
      ).resolves.toEqual({ status: 'skipped', reason: 'auto_ingest_disabled' })
      expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
      expect(spaceAutomation.processFathomRecordingEvent).not.toHaveBeenCalled()
    })

    it('reports not_connected when the user has no connection', async () => {
      repository.findConnectionForUser.mockResolvedValue(null)
      await expect(
        service.intakeForUser({
          provider: 'fathom',
          userId: 'user_1',
          externalId: 'meeting_1',
          inlineEvent: transcriptEvent,
        }),
      ).resolves.toEqual({ status: 'skipped', reason: 'not_connected' })
    })

    it('skips every route when the provider hook says so', async () => {
      provider.hooks.beforeIntake.mockResolvedValue({
        proceed: false,
        reason: 'agenda_occurrence_minimized',
      })
      const result = await service.intake({
        provider,
        connection: connection(),
        externalId: 'meeting_1',
        inlineEvent: transcriptEvent,
      })
      expect(result).toEqual({ status: 'skipped', reason: 'agenda_occurrence_minimized' })
      expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
      expect(customerBrain.listEnabledCustomerBrainsForRouting).not.toHaveBeenCalled()
      expect(spaceAutomation.processFathomRecordingEvent).not.toHaveBeenCalled()
    })

    it('charges the selected org when billing is org scoped and the user holds a billing role', async () => {
      await service.intake({
        provider,
        connection: connection({
          metadata: {
            auto_ingest: true,
            auto_ingest_billing_scope: 'org',
            auto_ingest_billing_org_id: 'org_9',
          },
        }),
        externalId: 'meeting_1',
        inlineEvent: transcriptEvent,
      })
      expect(repository.findActiveOrgMemberRole).toHaveBeenCalledWith('user_1', 'org_9')
      expect(importJobs.enqueueMeetingTranscriptImport).toHaveBeenCalledWith(
        'user_1',
        expect.anything(),
        'org_9',
      )
      expect(customerBrain.listEnabledCustomerBrainsForRouting).toHaveBeenCalledWith('user_1', {
        orgId: 'org_9',
      })
    })

    it('does not fall back to personal when stored org billing is invalid', async () => {
      repository.findActiveOrgMemberRole.mockResolvedValue('member')
      await expect(
        service.intake({
          provider,
          connection: connection({
            metadata: {
              auto_ingest: true,
              auto_ingest_billing_scope: 'org',
              auto_ingest_billing_org_id: 'org_9',
            },
          }),
          externalId: 'meeting_1',
          inlineEvent: transcriptEvent,
        }),
      ).rejects.toThrow(/not authorized/)
      expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
    })

    it('emits one customer interaction envelope per enabled customer brain', async () => {
      customerBrain.listEnabledCustomerBrainsForRouting.mockResolvedValue([
        { id: 'brain_a', org_id: null },
        { id: 'brain_b', org_id: 'org_9' },
      ])
      await service.intake({
        provider,
        connection: connection(),
        externalId: 'meeting_1',
        inlineEvent: transcriptEvent,
      })
      expect(repository.enqueueBrainOpsOutboxRows).toHaveBeenCalledTimes(1)
      const rows = repository.enqueueBrainOpsOutboxRows.mock.calls[0]![0] as Array<
        Record<string, any>
      >
      expect(rows).toHaveLength(2)
      expect(rows[0]).toMatchObject({
        brain_id: 'brain_a',
        user_id: 'user_1',
        event_type: 'customer_interaction_route',
        dedupe_key: 'interaction-brain_a-meeting_1-meeting_1',
      })
      expect(rows[0]!.payload).toMatchObject({
        source: 'fathom_webhook',
        routing_scope: 'personal',
        meeting_id: 'meeting_1',
        envelope: expect.objectContaining({ v: 1, channel: 'fathom', source_id: 'meeting_1' }),
      })
      expect(rows[0]!.payload.envelope.content.text).toBe('Host: Important decision')
    })

    it('still routes the Meetings space when the provider sends no transcript', async () => {
      const result = await service.intake({
        provider,
        connection: connection(),
        externalId: 'meeting_1',
        inlineEvent: { ...transcriptEvent, transcript: undefined },
      })
      expect(result).toMatchObject({ status: 'processed', hasTranscript: false, brainJobId: null })
      expect(importJobs.enqueueMeetingTranscriptImport).not.toHaveBeenCalled()
      expect(customerBrain.listEnabledCustomerBrainsForRouting).not.toHaveBeenCalled()
      expect(spaceAutomation.processFathomRecordingEvent).toHaveBeenCalled()
      expect(provider.hooks.afterSpaceRoute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user_1' }),
        expect.objectContaining({
          hasTranscript: false,
          spaceRoute: expect.objectContaining({ space_id: 'space_1' }),
        }),
      )
    })

    it('keeps going when the Meetings space route throws', async () => {
      spaceAutomation.processFathomRecordingEvent.mockRejectedValue(new Error('space down'))
      const result = await service.intake({
        provider,
        connection: connection(),
        externalId: 'meeting_1',
        inlineEvent: transcriptEvent,
      })
      expect(result).toMatchObject({ status: 'processed', spaceRoute: null })
      expect(provider.hooks.afterSpaceRoute).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ spaceRoute: null, hasTranscript: true }),
      )
    })
  })
})
