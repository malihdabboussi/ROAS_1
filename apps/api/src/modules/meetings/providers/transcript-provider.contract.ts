import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingProviderId, TranscriptSourceEvent } from './transcript-source.types'

/**
 * What a note taker must provide to join the meeting intake.
 *
 * Only `identity` and `normalize` are mandatory. `push` (webhook), `pull`
 * (fetch / list / poll) and `hooks` are optional capability groups, so a
 * webhook-only provider (Read.ai), a pull-only provider (an MCP server) and a
 * full provider (Fathom) all fit without faking methods they do not have.
 */

export type ProviderAuthStyle = 'oauth2' | 'api_key' | 'signing_key' | 'mcp'

export type MeetingConnection = {
  id: string
  userId: string
  orgId: string | null
  provider: MeetingProviderId
  status: string
  metadata: Record<string, unknown>
}

export type ProviderContext = {
  supabase: SupabaseClient
  userId: string
  /** Billing / routing org resolved from the connection's auto-ingest settings. */
  orgId: string | null
  connection: MeetingConnection
}

export type WebhookHeaders = Record<string, string | undefined>

export type WebhookParseResult = {
  externalId: string
  /** Provider delivery id used for replay protection; null when the provider has none. */
  deliveryId: string | null
  eventType: string
  /** Full event when the delivery carries the meeting inline; null when only a ping. */
  inlineEvent: Record<string, unknown> | null
  /** True for deliveries to acknowledge but not process (for example a meeting-start ping). */
  ignore?: boolean
}

export type MeetingListItem = {
  externalId: string
  title: string
  startedAt: string | null
  url: string | null
  raw: Record<string, unknown>
}

export type MeetingListPage = { items: MeetingListItem[]; nextCursor: string | null }

export type ProviderManifest = {
  displayName: string
  personalOnly: boolean
  logoKey: string
}

export type ProviderPushCapability = {
  verify(input: {
    rawBody: Buffer
    headers: WebhookHeaders
    secret: string
    nowMs?: number
  }): boolean
  parse(rawBody: Buffer, headers: WebhookHeaders): WebhookParseResult | null
  resolveSecret(ctx: ProviderContext): Promise<string | null>
}

export type ProviderPullCapability = {
  fetch(
    ctx: ProviderContext,
    externalId: string,
    inlineEvent: Record<string, unknown> | null,
  ): Promise<TranscriptSourceEvent>
  listRecent?(ctx: ProviderContext, cursor?: string | null): Promise<MeetingListPage>
  pollSince?(
    ctx: ProviderContext,
    cursor: string | null,
  ): Promise<{ events: TranscriptSourceEvent[]; nextCursor: string | null }>
}

export type IntakeSpaceRoute = Record<string, unknown> | null

export type ProviderHooks = {
  /** Runs before any fan-out. Return `proceed: false` to skip the meeting entirely. */
  beforeIntake?(
    ctx: ProviderContext,
    input: { source: TranscriptSourceEvent },
  ): Promise<{ proceed: boolean; reason?: string }>
  /** Runs after the Meetings space route, for provider-specific downstream routing. */
  afterSpaceRoute?(
    ctx: ProviderContext,
    input: { source: TranscriptSourceEvent; spaceRoute: IntakeSpaceRoute; hasTranscript: boolean },
  ): Promise<void>
}

export interface TranscriptProvider {
  identity: { id: MeetingProviderId; auth: ProviderAuthStyle; manifest: ProviderManifest }
  push?: ProviderPushCapability
  pull?: ProviderPullCapability
  normalize(raw: Record<string, unknown>): TranscriptSourceEvent
  hooks?: ProviderHooks
}

export type ProviderCapabilities = {
  id: MeetingProviderId
  auth: ProviderAuthStyle
  manifest: ProviderManifest
  push: boolean
  pull: boolean
  listRecent: boolean
  poll: boolean
}

export function describeProviderCapabilities(provider: TranscriptProvider): ProviderCapabilities {
  return {
    id: provider.identity.id,
    auth: provider.identity.auth,
    manifest: provider.identity.manifest,
    push: Boolean(provider.push),
    pull: Boolean(provider.pull),
    listRecent: Boolean(provider.pull?.listRecent),
    poll: Boolean(provider.pull?.pollSince),
  }
}
