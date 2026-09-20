import { createHmac, timingSafeEqual } from 'crypto'
import type {
  ProviderContext,
  TranscriptProvider,
  WebhookHeaders,
  WebhookParseResult,
} from '../providers/transcript-provider.contract'
import type { TranscriptSourceEvent } from '../providers/transcript-source.types'
import { readText } from './json-path-lite'
import { normalizeMappedMeetingSource, readEventType } from './mapped-meeting-source'
import type { NoteTakerDefinition, NoteTakerSignatureConfig } from './note-taker-definition.schema'

export const CUSTOM_NOTE_TAKER_SECRET_LABEL = 'signing_key'

/** Stands in for a secret when the definition has no signature; never a real key. */
const NO_SIGNATURE_SENTINEL = 'no-signature'

export type SecretReader = (
  userId: string,
  provider: string,
  label: string,
) => Promise<string | null>

/**
 * One push-only plug-in class for every note taker defined from Settings.
 * Everything provider-specific comes from the definition: the signature rule,
 * the accepted event, and the field map.
 */
export class CustomWebhookTranscriptProvider implements TranscriptProvider {
  readonly identity: TranscriptProvider['identity']

  constructor(
    private readonly definition: NoteTakerDefinition,
    private readonly readSecret: SecretReader,
  ) {
    this.identity = {
      id: definition.slug,
      auth: 'signing_key',
      manifest: {
        displayName: definition.displayName,
        personalOnly: true,
        logoKey: definition.logoUrl ?? definition.slug,
      },
    }
  }

  readonly push = {
    verify: (input: { rawBody: Buffer; headers: WebhookHeaders; secret: string }): boolean =>
      verifyDefinedSignature(this.definition.signature, input),

    parse: (rawBody: Buffer): WebhookParseResult | null => {
      let event: Record<string, unknown>
      try {
        const parsed = JSON.parse(rawBody.toString('utf8')) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
        event = parsed as Record<string, unknown>
      } catch {
        return null
      }
      const externalId = readText(event, this.definition.fieldMap.externalId)
      if (!externalId) return null
      const { eventTypePath, acceptValues, deliveryIdPath } = this.definition.event
      const eventType = readEventType(event, eventTypePath) ?? 'delivery'
      const ignore =
        Array.isArray(acceptValues) && acceptValues.length > 0 && !acceptValues.includes(eventType)
      return {
        externalId,
        deliveryId: readText(event, deliveryIdPath),
        eventType,
        inlineEvent: event,
        ignore,
      }
    },

    resolveSecret: async (ctx: ProviderContext): Promise<string | null> => {
      if (this.definition.signature.scheme === 'none') return NO_SIGNATURE_SENTINEL
      return this.readSecret(ctx.userId, this.definition.slug, CUSTOM_NOTE_TAKER_SECRET_LABEL)
    },
  }

  normalize(raw: Record<string, unknown>): TranscriptSourceEvent {
    return normalizeMappedMeetingSource(raw, this.definition)
  }
}

export function verifyDefinedSignature(
  signature: NoteTakerSignatureConfig,
  input: { rawBody: Buffer; headers: WebhookHeaders; secret: string },
): boolean {
  if (signature.scheme === 'none') return input.secret === NO_SIGNATURE_SENTINEL
  const header = input.headers[signature.header.toLowerCase()]
  if (!header) return false
  const prefix = signature.prefix ?? ''
  if (prefix && !header.startsWith(prefix)) return false
  const presented = header.slice(prefix.length).trim()
  if (!presented) return false
  const key =
    signature.keyEncoding === 'base64'
      ? Buffer.from(input.secret, 'base64')
      : Buffer.from(input.secret, 'utf8')
  if (key.length === 0) return false
  const expected = createHmac('sha256', key).update(input.rawBody).digest(signature.encoding)
  const a = Buffer.from(expected)
  const b = Buffer.from(presented)
  return a.length === b.length && timingSafeEqual(a, b)
}
