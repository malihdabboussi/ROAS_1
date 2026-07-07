import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { buildInteractionDedupeKey, CUSTOMER_INTERACTION_ROUTE_EVENT } from '@vibey/api-shared'
import { DatabaseService } from '../../lib/services/database.service'
import {
  buildTelegramEnvelope,
  buildWidgetEnvelope,
  type SignalConversationRow,
  type SignalMessageRow,
} from './customer-interaction-envelope'

const DEFAULT_SWEEP_MS = 15 * 60 * 1000
const DEFAULT_FLUSH_TOKENS = 50_000
const DEFAULT_GRACE_MINUTES = 30
const SCOPE_BATCH_LIMIT = 200
const CONVERSATION_BATCH_LIMIT = 200
const MESSAGES_PER_FLUSH_LIMIT = 500

// Customer signal loop trigger (locked policy): accumulate unprocessed chat
// tokens per scope (org, or personal user), flush a scope when it crosses the
// token threshold OR when it still holds anything from a previous UTC day —
// the midnight gate. A flush emits one envelope per conversation (the
// threshold is the trigger, not the extraction unit) and advances each
// conversation's cursor, so re-runs are idempotent via outbox dedupe keys.

interface ScopeAggregate {
  orgId: string | null
  userId: string
  estTokens: number
  oldestUnprocessedAt: string | null
}

interface ScopeKeyInput {
  orgId: string | null
  userId: string
}

interface EnabledBrainRow {
  id: string
  owner_id: string
  org_id: string | null
}

type SupabaseLikeClient = {
  from(table: string): any
}

function signalChannel(metadata: Record<string, unknown> | null): 'telegram' | 'widget' | null {
  if (!metadata) return null
  if (typeof metadata.telegram_chat_id === 'string' && metadata.telegram_chat_id) return 'telegram'
  if (metadata.public === true || metadata.public === 'true') return 'widget'
  return null
}

@Injectable()
export class CustomerSignalSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CustomerSignalSweeperService.name)
  private timer: NodeJS.Timeout | null = null
  private sweepInFlight = false
  private readonly flushTokens: number
  private readonly graceMinutes: number

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    const configuredFlushTokens = Number(
      this.configService.get<number>('brainOps.customerSignalFlushTokens'),
    )
    this.flushTokens =
      Number.isFinite(configuredFlushTokens) && configuredFlushTokens > 0
        ? configuredFlushTokens
        : DEFAULT_FLUSH_TOKENS
    // 0 is a valid grace (flush immediately) — used by the smoke test.
    const configuredGrace = Number(
      this.configService.get<number>('brainOps.customerSignalGraceMinutes'),
    )
    this.graceMinutes =
      Number.isFinite(configuredGrace) && configuredGrace >= 0
        ? configuredGrace
        : DEFAULT_GRACE_MINUTES
  }

  onModuleInit() {
    const configured = Number(this.configService.get<number>('brainOps.customerSignalSweepMs'))
    if (Number.isFinite(configured) && configured <= 0) {
      this.logger.log('Customer signal sweeper disabled (CUSTOMER_SIGNAL_SWEEP_MS<=0)')
      return
    }
    const sweepMs = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SWEEP_MS

    this.timer = setInterval(() => {
      this.runSweep().catch((err) => {
        this.logger.error(`Customer signal sweep failed: ${(err as Error).message}`)
      })
    }, sweepMs)
    this.logger.log(
      `Customer signal sweeper started (interval=${sweepMs}ms, flushTokens=${this.flushTokens}, graceMinutes=${this.graceMinutes})`,
    )

    setTimeout(() => {
      this.runSweep().catch((err) => {
        this.logger.error(`Initial customer signal sweep failed: ${(err as Error).message}`)
      })
    }, 10_000)
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async runSweep(): Promise<void> {
    if (this.sweepInFlight) return
    this.sweepInFlight = true
    try {
      const scopes = await this.listCandidateScopes()
      const now = Date.now()
      let flushedScopes = 0
      let enqueued = 0
      for (const scope of scopes) {
        if (!this.shouldFlushScope(scope, now)) continue
        const result = await this.flushScope({ orgId: scope.orgId, userId: scope.userId })
        flushedScopes += 1
        enqueued += result.enqueued
      }
      if (flushedScopes > 0) {
        this.logger.log(
          `Customer signal sweep flushed ${flushedScopes} scope(s), enqueued ${enqueued} interaction route(s)`,
        )
      }
    } finally {
      this.sweepInFlight = false
    }
  }

  // Both gates live here so the policy is one pure, testable decision:
  // tokens ≥ threshold (mid-day flush) OR leftovers from a previous UTC day
  // (the stateless midnight gate — no run bookkeeping needed).
  shouldFlushScope(
    scope: { estTokens: number; oldestUnprocessedAt: string | null },
    nowMs: number,
  ): boolean {
    if (!scope.oldestUnprocessedAt || scope.estTokens <= 0) return false
    if (scope.estTokens >= this.flushTokens) return true
    const startOfTodayUtc = new Date(nowMs)
    startOfTodayUtc.setUTCHours(0, 0, 0, 0)
    const oldest = Date.parse(scope.oldestUnprocessedAt)
    return Number.isFinite(oldest) && oldest < startOfTodayUtc.getTime()
  }

  async listCandidateScopes(): Promise<ScopeAggregate[]> {
    if (this.databaseService.hasPgPool()) {
      const { rows } = await this.databaseService.pgQuery<{
        org_id: string | null
        user_id: string
        est_tokens: string | number
        oldest_unprocessed_at: string | null
      }>(
        `
          SELECT c.org_id, c.user_id,
                 SUM(CEIL(LENGTH(COALESCE(m.content, '')) / 4.0))::bigint AS est_tokens,
                 MIN(m.created_at) AS oldest_unprocessed_at
          FROM conversations c
          JOIN messages m ON m.conversation_id = c.id
          WHERE c.status = 'active'
            AND m.role IN ('user', 'assistant')
            AND (c.last_extracted_message_at IS NULL OR m.created_at > c.last_extracted_message_at)
            AND (
              c.metadata ? 'telegram_chat_id'
              OR c.metadata->>'public' = 'true'
            )
          GROUP BY c.org_id, c.user_id
          LIMIT $1
        `,
        [SCOPE_BATCH_LIMIT],
      )
      return rows.map((row) => ({
        orgId: row.org_id,
        userId: row.user_id,
        estTokens: Number(row.est_tokens) || 0,
        oldestUnprocessedAt: row.oldest_unprocessed_at,
      }))
    }

    // Supabase fallback (no direct PG connection): aggregate in JS.
    const client = this.databaseService.getClient()
    const conversations = await this.listSignalConversations(client, null)
    const scopes = new Map<string, ScopeAggregate>()
    for (const conversation of conversations) {
      const messages = await this.listUnprocessedMessages(client, conversation)
      if (messages.length === 0) continue
      const estTokens = messages.reduce(
        (sum, message) => sum + Math.ceil((message.content ?? '').length / 4),
        0,
      )
      const oldest = messages[0]?.created_at ?? null
      const key = conversation.org_id ?? `personal:${conversation.user_id}`
      const existing = scopes.get(key)
      if (existing) {
        existing.estTokens += estTokens
        if (oldest && (!existing.oldestUnprocessedAt || oldest < existing.oldestUnprocessedAt)) {
          existing.oldestUnprocessedAt = oldest
        }
      } else {
        scopes.set(key, {
          orgId: conversation.org_id,
          userId: conversation.user_id,
          estTokens,
          oldestUnprocessedAt: oldest,
        })
      }
    }
    return [...scopes.values()]
  }

  async flushScope(
    scope: ScopeKeyInput,
  ): Promise<{ enqueued: number; conversationsFlushed: number }> {
    const client = this.databaseService.getClient() as SupabaseLikeClient

    const brains = await this.listEnabledCustomerBrains(client, scope)
    // No enabled brain → leave cursors untouched so enabling the brain later
    // ingests the backlog (outcome O9).
    if (brains.length === 0) return { enqueued: 0, conversationsFlushed: 0 }

    const conversations = await this.listSignalConversations(client, scope)
    const graceMs = this.graceMinutes * 60 * 1000
    const now = Date.now()
    let enqueued = 0
    let conversationsFlushed = 0

    for (const conversation of conversations) {
      const channel = signalChannel(conversation.metadata)
      if (!channel) continue

      const messages = await this.listUnprocessedMessages(client, conversation)
      if (messages.length === 0) continue

      const newest = messages[messages.length - 1]
      const newestAt = Date.parse(newest.created_at)
      if (Number.isFinite(newestAt) && now - newestAt < graceMs) continue

      const envelope =
        channel === 'telegram'
          ? buildTelegramEnvelope(conversation, messages)
          : buildWidgetEnvelope(conversation, messages)
      if (!envelope) continue

      for (const brain of brains) {
        const dedupeKey = buildInteractionDedupeKey(brain.id, conversation.id, newest.id)
        const inserted = await this.enqueueIfMissing(client, brain, dedupeKey, envelope)
        enqueued += inserted
      }

      // Cursor advances AFTER enqueue: a crash between the two re-emits with
      // the same dedupe key (no-op) instead of losing the episode.
      await client
        .from('conversations')
        .update({
          last_extracted_message_id: newest.id,
          last_extracted_message_at: newest.created_at,
        })
        .eq('id', conversation.id)
      conversationsFlushed += 1
    }

    return { enqueued, conversationsFlushed }
  }

  private async listEnabledCustomerBrains(
    client: SupabaseLikeClient,
    scope: ScopeKeyInput,
  ): Promise<EnabledBrainRow[]> {
    let query = client
      .from('ns_brains')
      .select('id, owner_id, org_id')
      .eq('scope', 'customer')
      .eq('cortex_max', true)
    query =
      scope.orgId === null
        ? query.eq('owner_id', scope.userId).is('org_id', null)
        : query.eq('org_id', scope.orgId)
    const { data, error } = await query
    if (error) {
      this.logger.warn(`Failed to list customer brains: ${error.message}`)
      return []
    }
    return (data ?? []) as EnabledBrainRow[]
  }

  private async listSignalConversations(
    client: SupabaseLikeClient,
    scope: ScopeKeyInput | null,
  ): Promise<SignalConversationRow[]> {
    let query = client
      .from('conversations')
      .select('id, user_id, org_id, title, metadata, contact_id, last_extracted_message_at')
      .eq('status', 'active')
      .limit(CONVERSATION_BATCH_LIMIT)
    if (scope) {
      query =
        scope.orgId === null
          ? query.eq('user_id', scope.userId).is('org_id', null)
          : query.eq('org_id', scope.orgId)
    }
    const { data, error } = await query
    if (error) {
      this.logger.warn(`Failed to list signal conversations: ${error.message}`)
      return []
    }
    return ((data ?? []) as SignalConversationRow[]).filter(
      (conversation) => signalChannel(conversation.metadata) !== null,
    )
  }

  private async listUnprocessedMessages(
    client: SupabaseLikeClient,
    conversation: SignalConversationRow,
  ): Promise<SignalMessageRow[]> {
    let query = client
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(MESSAGES_PER_FLUSH_LIMIT)
    if (conversation.last_extracted_message_at) {
      query = query.gt('created_at', conversation.last_extracted_message_at)
    }
    const { data, error } = await query
    if (error) {
      this.logger.warn(
        `Failed to list messages for conversation ${conversation.id}: ${error.message}`,
      )
      return []
    }
    return (data ?? []) as SignalMessageRow[]
  }

  private async enqueueIfMissing(
    client: SupabaseLikeClient,
    brain: EnabledBrainRow,
    dedupeKey: string,
    envelope: unknown,
  ): Promise<number> {
    const { data: existing } = await client
      .from('brain_ops_outbox')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .limit(1)
      .maybeSingle()
    if (existing?.id) return 0

    const { error } = await client.from('brain_ops_outbox').insert({
      brain_id: brain.id,
      user_id: brain.owner_id,
      org_id: brain.org_id ?? null,
      event_type: CUSTOMER_INTERACTION_ROUTE_EVENT,
      dedupe_key: dedupeKey,
      payload: { source: 'customer_signal_sweeper', envelope },
    })
    if (error) {
      // Unique-violation races with a concurrent sweep are expected; anything
      // else is logged and retried on the next sweep because the cursor only
      // advances after this conversation's enqueue loop.
      if (String((error as { code?: string }).code ?? '') !== '23505') {
        this.logger.warn(`Failed to enqueue customer interaction route: ${error.message}`)
      }
      return 0
    }
    return 1
  }
}
