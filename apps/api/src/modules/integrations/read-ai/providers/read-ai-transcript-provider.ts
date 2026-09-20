import { Injectable, type OnModuleInit } from '@nestjs/common'
import { MeetingProviderRegistry } from '../../../meetings/providers/meeting-provider.registry'
import { normalizeReadAiMeetingSource } from '../../../meetings/providers/read-ai-meeting-source'
import type {
  ProviderContext,
  TranscriptProvider,
  WebhookHeaders,
  WebhookParseResult,
} from '../../../meetings/providers/transcript-provider.contract'
import type { TranscriptSourceEvent } from '../../../meetings/providers/transcript-source.types'
import { VaultService } from '../../../vault/services/vault.service'
import { READ_AI_SIGNING_KEY_LABEL } from '../services/read-ai-api.service'
import { verifyReadAiWebhookSignature } from './read-ai-webhook-signature'

/**
 * Read.ai behind the transcript-provider contract. Webhook only: Read.ai
 * pushes the complete meeting report, so there is nothing to fetch and no
 * "import past meetings" list.
 */
@Injectable()
export class ReadAiTranscriptProvider implements TranscriptProvider, OnModuleInit {
  readonly identity = {
    id: 'read_ai' as const,
    auth: 'signing_key' as const,
    manifest: { displayName: 'Read AI', personalOnly: true, logoKey: 'read_ai' },
  }

  constructor(
    private readonly registry: MeetingProviderRegistry,
    private readonly vault: VaultService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this)
  }

  readonly push = {
    verify: (input: { rawBody: Buffer; headers: WebhookHeaders; secret: string }): boolean =>
      verifyReadAiWebhookSignature(input),

    parse: (rawBody: Buffer): WebhookParseResult | null => {
      let event: Record<string, unknown>
      try {
        const parsed = JSON.parse(rawBody.toString('utf8')) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
        event = parsed as Record<string, unknown>
      } catch {
        return null
      }
      const sessionId = firstText(event.session_id)
      if (!sessionId) return null
      const trigger = firstText(event.trigger) ?? 'meeting_end'
      return {
        externalId: sessionId,
        deliveryId: firstText(event.request_id),
        eventType: trigger,
        inlineEvent: event,
        // Workspace webhooks can fire at meeting start with no report yet.
        ignore: trigger !== 'meeting_end',
      }
    },

    resolveSecret: async (ctx: ProviderContext): Promise<string | null> =>
      this.vault.getSecret(ctx.userId, 'read_ai', READ_AI_SIGNING_KEY_LABEL),
  }

  normalize(raw: Record<string, unknown>): TranscriptSourceEvent {
    return normalizeReadAiMeetingSource(raw)
  }
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}
