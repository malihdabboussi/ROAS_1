import { createHash } from 'node:crypto'
import { Injectable, Logger, Optional } from '@nestjs/common'
import type { InteractionChannel, InteractionEnvelopeV1 } from '@vibey/api-shared'
import { MissionWorkerBillingClientService } from '../provider-billing/mission-worker-billing-client.service'

// Cheap path of the customer signal loop: when an interaction has exactly one
// customer/source identity there is nothing for Atlas to judge — a single Gemini
// extraction call writes the memories directly (same gates as the user-brain
// conversation extraction: significance >= 0.6, content_hash dedupe). The full
// Atlas routing run is reserved for multi-participant/ambiguous interactions.

const GEMINI_LLM_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'
const GEMINI_EMBEDDING_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent'
const GEMINI_LLM_MODEL = 'gemini-3.5-flash'
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'

const SIGNIFICANCE_THRESHOLD = 0.6

const CUSTOMER_MEMORY_TYPES = new Set([
  'decision',
  'insight',
  'preference',
  'fact',
  'story',
  'framework',
  'event',
])

const CHAT_CHANNELS = new Set<InteractionChannel>(['telegram', 'widget'])
/** telegram_chat, widget_chat; every meeting note taker (built-in or defined) is `<channel>_call`. */
const sourceTypeFor = (channel: InteractionChannel) =>
  `${channel}_${CHAT_CHANNELS.has(channel) ? 'chat' : 'call'}`

interface ExtractedCustomerMemory {
  content: string
  type: string
  speaker: string | null
  confidence: number
  significance: number
  tags: string[]
}

type GeminiUsage = { input: number; output: number; totalTokens: number }

export interface ExtractionInput {
  envelope: InteractionEnvelopeV1
  brainId: string
  userId: string
  orgId: string | null
  contactId: string | null
}

export interface ExtractionResult {
  status: 'ok' | 'skipped' | 'error'
  memories_created: number
  memory_ids: string[]
  reason?: string
}

type SupabaseLikeClient = { from(table: string): any }

interface CustomerInteractionSourceIdentity {
  sourceType: string
  sourceId: string
  identityKind: string
  sourceLabel: string | null
  sourceAnchorField: string
  sourceAnchorValue: string
}

type CustomerIdentityResolution =
  | {
      customerEntityId: string | null
      customerSourceIdentityId: string | null
      resolutionStatus: 'linked_contact' | 'linked_entity' | 'unlinked_source' | 'unresolved'
    }
  | { error: string }

function normalizedIdentifierValue(kind: string, value: string): string {
  const trimmed = value.trim()
  return kind === 'email' ? trimmed.toLowerCase() : trimmed
}

function sourceTypeForIdentifier(channel: InteractionChannel, kind: string): string {
  if (kind === 'email') return 'email'
  if (kind === 'telegram_chat_id') return 'telegram_chat'
  if (kind === 'visitor_id') return 'widget_visitor'
  return `${channel}_${kind}`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase()
}

@Injectable()
export class CustomerInteractionExtractionService {
  private readonly logger = new Logger(CustomerInteractionExtractionService.name)

  constructor(@Optional() private readonly billingClient?: MissionWorkerBillingClientService) {}

  async extractAndSave(
    client: SupabaseLikeClient,
    input: ExtractionInput,
  ): Promise<ExtractionResult> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return {
        status: 'error',
        memories_created: 0,
        memory_ids: [],
        reason: 'GEMINI_API_KEY not configured',
      }
    }

    let raw: string
    try {
      const prompt = this.buildExtractionPrompt(input.envelope)
      const result = await this.callGemini(apiKey, prompt)
      await this.chargeGeminiUsage(input, {
        action: 'customer_interaction_extraction',
        modelName: GEMINI_LLM_MODEL,
        usage: result.usage,
        costSource: result.costSource,
        metadata: {
          channel: input.envelope.channel,
          source_id: input.envelope.source_id,
        },
      })
      raw = result.text
    } catch (err) {
      return {
        status: 'error',
        memories_created: 0,
        memory_ids: [],
        reason: `Gemini extraction call failed: ${(err as Error).message}`,
      }
    }

    let extracted: ExtractedCustomerMemory[]
    try {
      extracted = JSON.parse(raw) as ExtractedCustomerMemory[]
    } catch {
      this.logger.error(`Failed to parse extraction JSON: ${raw.slice(0, 300)}`)
      return {
        status: 'error',
        memories_created: 0,
        memory_ids: [],
        reason: 'LLM returned invalid JSON',
      }
    }

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return { status: 'skipped', memories_created: 0, memory_ids: [] }
    }

    const significant = extracted.filter(
      (item) =>
        typeof item?.content === 'string' &&
        item.content.trim().length > 0 &&
        (item.significance ?? 0) >= SIGNIFICANCE_THRESHOLD,
    )
    if (significant.length === 0) {
      return { status: 'skipped', memories_created: 0, memory_ids: [] }
    }

    const sourceType = sourceTypeFor(input.envelope.channel)
    const sourceIdentity = this.sourceIdentityForEnvelope(input.envelope)
    const identity = await this.resolveCustomerIdentity(client, input, sourceIdentity)
    if ('error' in identity) {
      return {
        status: 'error',
        memories_created: 0,
        memory_ids: [],
        reason: identity.error,
      }
    }
    const memoryIds: string[] = []
    const assertedAt = new Date().toISOString()
    const episodeId = await this.upsertEpisode(
      client,
      input,
      sourceType,
      assertedAt,
      identity,
      sourceIdentity,
    )

    for (const item of significant) {
      const content = item.content.trim()
      const contentHash = createHash('sha256').update(content).digest('hex')

      const { data: existing } = await client
        .from('ns_memories')
        .select('id')
        .eq('brain_id', input.brainId)
        .eq('content_hash', contentHash)
        .limit(1)
        .maybeSingle()
      if (existing?.id) continue

      const embedding = await this.getEmbedding(apiKey, content)
      if (embedding) {
        await this.chargeGeminiUsage(input, {
          action: 'customer_memory_embedding',
          modelName: GEMINI_EMBEDDING_MODEL,
          usage: {
            input: this.estimateTokens(content),
            output: 0,
            totalTokens: this.estimateTokens(content),
          },
          costSource: 'char_estimate',
          metadata: { content_hash: contentHash },
        })
      }

      const { data: created, error } = await client
        .from('ns_memories')
        .insert({
          brain_id: input.brainId,
          contact_id: input.contactId ?? null,
          content,
          content_hash: contentHash,
          memory_type: CUSTOMER_MEMORY_TYPES.has(item.type) ? item.type : 'insight',
          source_type: sourceType,
          source_id: input.envelope.source_id,
          source_title: input.envelope.title,
          customer_entity_id: identity.customerEntityId,
          customer_source_identity_id: identity.customerSourceIdentityId,
          customer_resolution_status: identity.resolutionStatus,
          episode_id: episodeId,
          occurred_at: input.envelope.window.from,
          occurred_until: input.envelope.window.to,
          asserted_at: assertedAt,
          temporal_status: 'current',
          temporal_confidence: 1,
          temporal_source: `${input.envelope.channel}_envelope`,
          speaker: item.speaker?.trim() || 'customer',
          confidence: Math.max(0, Math.min(1, item.confidence ?? 0.8)),
          significance: Math.max(0, Math.min(1, item.significance ?? SIGNIFICANCE_THRESHOLD)),
          tags: [...new Set([...(item.tags ?? []), 'customer_brain'])],
          agent_id: 'atlas',
          metadata: {
            user_id: input.userId,
            import_source: sourceType,
            interaction_window: input.envelope.window,
            identity_resolution: {
              status: identity.resolutionStatus,
              contact_id: input.contactId ?? null,
              customer_entity_id: identity.customerEntityId,
              customer_source_identity_id: identity.customerSourceIdentityId,
              source_type: sourceIdentity.sourceType,
              source_id: sourceIdentity.sourceId,
              identity_kind: sourceIdentity.identityKind,
              source_anchor_field: sourceIdentity.sourceAnchorField,
              source_anchor_value: sourceIdentity.sourceAnchorValue,
            },
            temporal: {
              occurred_at: input.envelope.window.from,
              occurred_until: input.envelope.window.to,
              asserted_at: assertedAt,
              temporal_source: `${input.envelope.channel}_envelope`,
            },
          },
          ...(embedding ? { embedding } : {}),
        })
        .select('id')
        .single()

      if (error || !created?.id) {
        return {
          status: 'error',
          memories_created: memoryIds.length,
          memory_ids: memoryIds,
          reason: `Failed to save customer memory: ${error?.message ?? 'no row returned'}`,
        }
      }
      memoryIds.push(String(created.id))
    }

    return { status: 'ok', memories_created: memoryIds.length, memory_ids: memoryIds }
  }

  private sourceIdentityForEnvelope(
    envelope: InteractionEnvelopeV1,
  ): CustomerInteractionSourceIdentity {
    const participant =
      envelope.participants.find((candidate) => candidate.role === 'customer') ??
      envelope.participants.find((candidate) => candidate.role === 'unknown') ??
      null
    const identifiers = participant?.identifiers ?? []
    const selected =
      identifiers.find((candidate) => candidate.kind === 'email' && candidate.value.trim()) ??
      identifiers.find(
        (candidate) => candidate.kind === 'telegram_chat_id' && candidate.value.trim(),
      ) ??
      identifiers.find((candidate) => candidate.kind === 'visitor_id' && candidate.value.trim()) ??
      identifiers.find((candidate) => candidate.value.trim()) ??
      null

    if (selected) {
      const value = normalizedIdentifierValue(selected.kind, selected.value)
      return {
        sourceType: sourceTypeForIdentifier(envelope.channel, selected.kind),
        sourceId: value,
        identityKind: selected.kind,
        sourceLabel: participant?.name ?? envelope.title,
        sourceAnchorField: selected.kind,
        sourceAnchorValue: value,
      }
    }

    return {
      sourceType: sourceTypeFor(envelope.channel),
      sourceId: envelope.source_id,
      identityKind: 'source_id',
      sourceLabel: envelope.title,
      sourceAnchorField: 'source_id',
      sourceAnchorValue: envelope.source_id,
    }
  }

  private async resolveCustomerIdentity(
    client: SupabaseLikeClient,
    input: ExtractionInput,
    sourceIdentity: CustomerInteractionSourceIdentity,
  ): Promise<CustomerIdentityResolution> {
    const now = new Date().toISOString()
    const entityKey = input.contactId
      ? `contact:${input.contactId}`
      : `source:${sourceIdentity.sourceType}:${sourceIdentity.sourceId}`

    const { data: entity, error: entityError } = await client
      .from('customer_entities')
      .upsert(
        {
          brain_id: input.brainId,
          owner_id: input.userId,
          org_id: input.orgId,
          entity_key: entityKey,
          entity_type: input.contactId ? 'contact' : 'source_identity',
          display_name:
            sourceIdentity.sourceLabel ??
            (input.contactId ? `Contact ${input.contactId.slice(0, 8)}` : sourceIdentity.sourceId),
          primary_contact_id: input.contactId ?? null,
          confidence: input.contactId ? 1 : 0.65,
          metadata: {
            source: 'customer_interaction_extraction',
            channel: input.envelope.channel,
            interaction_source_id: input.envelope.source_id,
            source_identity_kind: sourceIdentity.identityKind,
            source_identity_value: sourceIdentity.sourceId,
          },
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: 'brain_id,entity_key' },
      )
      .select('id')
      .single()
    if (entityError) {
      return { error: `Failed to resolve customer entity: ${entityError.message}` }
    }

    const customerEntityId = typeof entity?.id === 'string' ? entity.id : null
    const { data: source, error: sourceError } = await client
      .from('customer_source_identities')
      .upsert(
        {
          brain_id: input.brainId,
          customer_entity_id: customerEntityId,
          contact_id: input.contactId ?? null,
          source_type: sourceIdentity.sourceType,
          source_id: sourceIdentity.sourceId,
          identity_kind: sourceIdentity.identityKind,
          source_label: sourceIdentity.sourceLabel,
          confidence: input.contactId ? 0.9 : 0.65,
          metadata: {
            source: 'customer_interaction_extraction',
            channel: input.envelope.channel,
            interaction_source_id: input.envelope.source_id,
            source_anchor_field: sourceIdentity.sourceAnchorField,
            source_anchor_value: sourceIdentity.sourceAnchorValue,
          },
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: 'brain_id,source_type,source_id' },
      )
      .select('id')
      .single()
    if (sourceError) {
      return { error: `Failed to resolve customer source identity: ${sourceError.message}` }
    }

    return {
      customerEntityId,
      customerSourceIdentityId: typeof source?.id === 'string' ? source.id : null,
      resolutionStatus: input.contactId ? 'linked_contact' : 'unlinked_source',
    }
  }

  private async upsertEpisode(
    client: SupabaseLikeClient,
    input: ExtractionInput,
    sourceType: string,
    assertedAt: string,
    identity: Exclude<CustomerIdentityResolution, { error: string }>,
    sourceIdentity: CustomerInteractionSourceIdentity,
  ): Promise<string | null> {
    const { data, error } = await client
      .from('brain_episodes')
      .upsert(
        {
          brain_id: input.brainId,
          source_type: sourceType,
          source_id: input.envelope.source_id,
          source_title: input.envelope.title,
          occurred_at: input.envelope.window.from,
          occurred_until: input.envelope.window.to,
          asserted_at: assertedAt,
          temporal_confidence: 1,
          temporal_source: `${input.envelope.channel}_envelope`,
          participants: input.envelope.participants,
          metadata: {
            channel: input.envelope.channel,
            content_format: input.envelope.content.format,
            contact_id: input.contactId ?? null,
            identity_resolution: {
              status: identity.resolutionStatus,
              customer_entity_id: identity.customerEntityId,
              customer_source_identity_id: identity.customerSourceIdentityId,
              source_type: sourceIdentity.sourceType,
              source_id: sourceIdentity.sourceId,
              identity_kind: sourceIdentity.identityKind,
            },
            user_id: input.userId,
            org_id: input.orgId,
          },
        },
        { onConflict: 'brain_id,source_type,source_id' },
      )
      .select('id')
      .single()
    if (error) throw new Error(`Failed to upsert customer interaction episode: ${error.message}`)
    return typeof data?.id === 'string' ? data.id : null
  }

  private async callGemini(
    apiKey: string,
    prompt: string,
  ): Promise<{ text: string; usage: GeminiUsage; costSource: string }> {
    const res = await fetch(`${GEMINI_LLM_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!res.ok) {
      throw new Error(`Gemini LLM API error: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini')
    const usage = this.parseGeminiUsage(data, prompt, text)
    return {
      text,
      usage,
      costSource: data?.usageMetadata?.totalTokenCount ? 'runtime_tokens' : 'char_estimate',
    }
  }

  private async getEmbedding(apiKey: string, text: string): Promise<string | null> {
    try {
      const res = await fetch(`${GEMINI_EMBEDDING_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: text.slice(0, 12_000) }] },
          outputDimensionality: 768,
        }),
      })
      if (!res.ok) return null
      const data = await res.json()
      const values = data?.embedding?.values
      return Array.isArray(values) && values.length > 0 ? `[${values.join(',')}]` : null
    } catch {
      return null
    }
  }

  // Port of the user-brain extraction prompt (conversation-processing.service)
  // reframed for customer signal: what the CUSTOMER believes, decided, needs,
  // objects to — the inputs avatars and belief patterns are built from.
  private buildExtractionPrompt(envelope: InteractionEnvelopeV1): string {
    const customerName =
      envelope.participants.find((participant) => participant.role === 'customer')?.name ??
      'the customer'
    return `You are a ruthless customer-intelligence filter. You extract ONLY knowledge that reveals how a CUSTOMER thinks — their beliefs, goals, objections, decisions, pains, and buying context. You reject everything else.

The transcript below is a ${envelope.channel} interaction between ${customerName} (lines marked "Customer", or named speakers) and our team/assistant. Extract memories about the CUSTOMER only — never about our team, product, or assistant.

## STORE — Extract these (with examples):

**preference** — Beliefs, values, opinions the customer holds:
  "Believes email marketing is dead for his audience; trusts SMS"

**decision** — Choices the customer made WITH reasoning:
  "Decided to move the whole retention budget to SMS this quarter because open rates collapsed"

**story** — Experiences that shaped how the customer thinks:
  "Lost his first agency because he scaled headcount before retention was solved"

**framework** — How the customer models their own business:
  "Thinks of his funnel as webinar → call → high-ticket close"

**insight** — Non-obvious realizations about the customer's situation:
  "His real bottleneck is show-up rate, not lead volume"

**fact** — Significant, durable facts about the customer:
  "Runs a 7-figure ecommerce brand; goal is 30% repeat purchase rate by December; budget ~5k/month"

## NEVER STORE — Reject completely:
- Small talk, greetings, scheduling logistics
- Anything about OUR product, team, or assistant behavior
- Ephemeral details that will not matter in 6 months
- Support minutiae (password resets, button locations)

## GOLDEN RULE:
Would a great account manager write this on the customer's profile card and still find it useful in 6 months? If no → reject.

## OUTPUT:
Return a JSON array. Each item:
{ "content": "...", "type": "decision|insight|preference|fact|story|framework",
  "speaker": "name or null", "confidence": 0.0-1.0, "significance": 0.0-1.0, "tags": ["..."] }

Return EMPTY ARRAY [] if nothing qualifies.

INTERACTION (${envelope.title}):
${envelope.content.text}`
  }

  private async chargeGeminiUsage(
    input: ExtractionInput,
    params: {
      action: string
      modelName: string
      usage: GeminiUsage
      costSource: string
      metadata?: Record<string, unknown>
    },
  ): Promise<void> {
    if (params.usage.totalTokens <= 0) return
    if (!this.billingClient) {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('mission_worker_billing_client_not_configured')
    }
    await this.billingClient.chargeDirectTextUsage({
      userId: input.userId,
      orgId: input.orgId,
      feature: 'brain',
      action: params.action,
      modelName: params.modelName,
      usage: {
        input: params.usage.input,
        output: params.usage.output,
        totalTokens: params.usage.totalTokens,
      },
      costSource: params.costSource,
      metadata: {
        source: 'customer_interaction_extraction',
        brain_id: input.brainId,
        contact_id: input.contactId,
        ...(params.metadata ?? {}),
      },
    })
  }

  private parseGeminiUsage(data: any, prompt: string, output: string): GeminiUsage {
    const meta = data?.usageMetadata ?? {}
    const input = Number(meta.promptTokenCount ?? this.estimateTokens(prompt))
    const outputTokens = Number(meta.candidatesTokenCount ?? this.estimateTokens(output))
    const totalTokens = Number(meta.totalTokenCount ?? input + outputTokens)
    return {
      input: Number.isFinite(input) ? input : this.estimateTokens(prompt),
      output: Number.isFinite(outputTokens) ? outputTokens : this.estimateTokens(output),
      totalTokens: Number.isFinite(totalTokens) ? totalTokens : input + outputTokens,
    }
  }

  private estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4))
  }
}
