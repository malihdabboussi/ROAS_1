/**
 * Campaign Brain preload (plan §11.2): when a chat is bound to a real client
 * campaign (CONNECTIONS ≠ General), the client's Campaign Brain joins the
 * `[BRAIN CONTEXT]` packet under the same retrieval limits as the User Brain —
 * so a bound chat is no longer one tool-choice away from "I couldn't find it".
 */
import type { Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  PRELOAD_RETRIEVAL_LIMIT,
  type BrainContextSupportService,
  type BrainContextTimingMeta,
  type PrecomputedEmbedding,
} from './brain-context-support.service'
import type { BrainRetrievalService } from './brain-retrieval.service'

export type CampaignBrainPreloadTarget = {
  brainId: string
  campaignId: string
  campaignName: string | null
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

/** General / system campaigns never preload: they are the "no client" default. */
export function isGeneralCampaignRow(row: { name?: string | null; config?: unknown }): boolean {
  const config = asRecord(row.config)
  if (config.system_kind === 'general' || config.is_general === true || config.isSystemGeneral)
    return true
  return (row.name ?? '').trim().toLowerCase() === 'general'
}

export async function resolveCampaignBrainForPreload(
  supabase: SupabaseClient,
  input: { campaignId: string | null | undefined; orgId?: string | null },
): Promise<CampaignBrainPreloadTarget | null> {
  const campaignId = input.campaignId?.trim()
  if (!campaignId) return null
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, config, org_id')
    .eq('id', campaignId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!campaign || isGeneralCampaignRow(campaign)) return null
  if (input.orgId && campaign.org_id && String(campaign.org_id) !== input.orgId) return null
  const { data: brain } = await supabase
    .from('ns_brains')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('scope', 'campaign')
    .maybeSingle()
  if (!brain?.id) return null
  return {
    brainId: String(brain.id),
    campaignId,
    campaignName: typeof campaign.name === 'string' ? campaign.name : null,
  }
}

export function campaignBrainHeading(target: CampaignBrainPreloadTarget): string {
  return `CAMPAIGN BRAIN${target.campaignName ? ` (${target.campaignName})` : ''} — Retrieved Context:`
}

/** Memory lane uses family `user` regardless of `ns_brains.scope`; `brainId` pins the campaign brain. */
export async function buildCampaignBrainContext(
  support: BrainContextSupportService,
  input: {
    retrieval?: BrainRetrievalService
    target: CampaignBrainPreloadTarget
    userId: string
    orgId?: string | null
    query?: string
    agentKey?: string
    precomputedEmbedding?: PrecomputedEmbedding
  },
): Promise<string> {
  const trimmedQuery = input.query?.trim()
  if (!trimmedQuery || !input.retrieval) return ''
  return support.buildRetrievalContext({
    retrieval: input.retrieval,
    family: 'user',
    brainId: input.target.brainId,
    heading: campaignBrainHeading(input.target),
    userId: input.userId,
    orgId: input.orgId,
    query: trimmedQuery,
    agentKey: input.agentKey,
    embedding: support.retrievalEmbeddingInput(input.precomputedEmbedding),
    limit: PRELOAD_RETRIEVAL_LIMIT,
  })
}

/** The timed, fail-soft lane used inside `buildFullContext`; empty when no target. */
export function campaignBrainContextLane(
  support: BrainContextSupportService,
  logger: Pick<Logger, 'warn'>,
  input: {
    retrieval?: BrainRetrievalService
    target: CampaignBrainPreloadTarget | null
    timingMeta: BrainContextTimingMeta
    userId: string
    orgId?: string | null
    query?: string
    agentKey?: string
    precomputedEmbedding?: PrecomputedEmbedding
  },
): Promise<string> {
  const target = input.target
  if (!target) return Promise.resolve('')
  return support.timeContextPart(
    'campaign_context',
    input.timingMeta,
    () =>
      buildCampaignBrainContext(support, { ...input, target }).catch((err) => {
        logger.warn(`Campaign brain context failed: ${err}`)
        return ''
      }),
    (value) => support.contextStringTiming(value),
  )
}
