import { Injectable, type OnModuleInit } from '@nestjs/common'
import { normalizeFirefliesMeetingSource } from '../../../meetings/providers/fireflies-meeting-source'
import { MeetingProviderRegistry } from '../../../meetings/providers/meeting-provider.registry'
import type {
  MeetingListPage,
  ProviderContext,
  TranscriptProvider,
  WebhookHeaders,
  WebhookParseResult,
} from '../../../meetings/providers/transcript-provider.contract'
import type { TranscriptSourceEvent } from '../../../meetings/providers/transcript-source.types'
import { VaultService } from '../../../vault/services/vault.service'
import {
  FIREFLIES_WEBHOOK_SECRET_LABEL,
  FirefliesApiService,
} from '../services/fireflies-api.service'
import { verifyFirefliesWebhookSignature } from './fireflies-webhook-signature'

const LIST_PAGE_SIZE = 20

/**
 * Fireflies behind the transcript-provider contract: API key account, a
 * "Transcription completed" ping that carries only the meeting id, then a
 * GraphQL fetch of the full transcript.
 */
@Injectable()
export class FirefliesTranscriptProvider implements TranscriptProvider, OnModuleInit {
  readonly identity = {
    id: 'fireflies' as const,
    auth: 'api_key' as const,
    manifest: { displayName: 'Fireflies', personalOnly: true, logoKey: 'fireflies' },
  }

  constructor(
    private readonly registry: MeetingProviderRegistry,
    private readonly api: FirefliesApiService,
    private readonly vault: VaultService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this)
  }

  readonly push = {
    verify: (input: { rawBody: Buffer; headers: WebhookHeaders; secret: string }): boolean =>
      verifyFirefliesWebhookSignature(input),

    parse: (rawBody: Buffer): WebhookParseResult | null => {
      let event: Record<string, unknown>
      try {
        const parsed = JSON.parse(rawBody.toString('utf8')) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
        event = parsed as Record<string, unknown>
      } catch {
        return null
      }
      const meetingId = firstText(event.meetingId, event.meeting_id, event.transcriptId)
      if (!meetingId) return null
      return {
        externalId: meetingId,
        deliveryId: null,
        eventType: firstText(event.eventType, event.event_type) ?? 'Transcription completed',
        inlineEvent: null,
      }
    },

    resolveSecret: async (ctx: ProviderContext): Promise<string | null> =>
      this.vault.getSecret(ctx.userId, 'fireflies', FIREFLIES_WEBHOOK_SECRET_LABEL),
  }

  readonly pull = {
    fetch: async (
      ctx: ProviderContext,
      externalId: string,
      inlineEvent: Record<string, unknown> | null,
    ): Promise<TranscriptSourceEvent> => {
      if (inlineEvent && Array.isArray(inlineEvent.sentences) && inlineEvent.sentences.length > 0) {
        return this.normalize(inlineEvent)
      }
      const transcript = await this.api.getTranscript(ctx.userId, externalId)
      return this.normalize(transcript as unknown as Record<string, unknown>)
    },

    listRecent: async (ctx: ProviderContext, cursor?: string | null): Promise<MeetingListPage> => {
      const skip = Math.max(0, Number.parseInt(cursor ?? '0', 10) || 0)
      const transcripts = await this.api.listTranscripts(ctx.userId, {
        limit: LIST_PAGE_SIZE,
        skip,
      })
      return {
        items: transcripts.map((transcript) => {
          const row = transcript as unknown as Record<string, unknown>
          return {
            externalId: String(transcript.id),
            title: transcript.title?.trim() || 'Untitled Meeting',
            startedAt:
              typeof transcript.date === 'number' && Number.isFinite(transcript.date)
                ? new Date(transcript.date).toISOString()
                : null,
            url: transcript.transcript_url ?? null,
            raw: row,
          }
        }),
        nextCursor: transcripts.length === LIST_PAGE_SIZE ? String(skip + LIST_PAGE_SIZE) : null,
      }
    },
  }

  normalize(raw: Record<string, unknown>): TranscriptSourceEvent {
    return normalizeFirefliesMeetingSource(raw)
  }
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}
