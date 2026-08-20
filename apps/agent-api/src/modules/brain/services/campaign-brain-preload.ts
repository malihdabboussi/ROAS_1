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
import type { BrainRetrievalReceipt } from './brain-retrieval-receipt'
import type { BrainRetrievalService } from './brain-retrieval.service'

export const EXTRA_CAMPAIGN_BRAIN_PRELOAD_LIMIT = 2

export type CampaignBrainPreloadTarget = {
  brainId: string
  campaignId: string
  campaignName: string | null
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

/** Org system General never preloads. A client campaign named General still does. */
export function isGeneralCampaignRow(row: { name?: string | null; config?: unknown }): boolean {
  const config = asRecord(row.config)
  return (
    config.system_kind === 'general' ||
    config.is_general === true ||
    Boolean(config.isSystemGeneral)
  )
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

export async function resolveCampaignBrainLaneTargets(
  supabase: SupabaseClient,
  input: {
    campaignId?: string | null
    extraCampaignIds?: string[]
    orgId?: string | null
  },
): Promise<{
  primary: CampaignBrainPreloadTarget | null
  extras: CampaignBrainPreloadTarget[]
}> {
  const primary = await resolveCampaignBrainForPreload(supabase, {
    campaignId: input.campaignId,
    orgId: input.orgId,
  })
  const extras: CampaignBrainPreloadTarget[] = []
  const extraIds = [
    ...new Set((input.extraCampaignIds ?? []).map((id) => id.trim()).filter(Boolean)),
  ]
    .filter((id) => id !== primary?.campaignId && id !== input.campaignId)
    .slice(0, EXTRA_CAMPAIGN_BRAIN_PRELOAD_LIMIT)
  for (const campaignId of extraIds) {
    const target = await resolveCampaignBrainForPreload(supabase, {
      campaignId,
      orgId: input.orgId,
    })
    if (target) extras.push(target)
  }
  return { primary, extras }
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
    onRetrievalReceipt?: (receipt: BrainRetrievalReceipt) => void
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
    receiptScope: 'campaign',
    brainName: input.target.campaignName,
    onRetrievalReceipt: input.onRetrievalReceipt,
  })
}

/** The timed, fail-soft lane used inside `buildFullContext`; empty when no target. */
export function campaignBrainContextLane(
  support: BrainContextSupportService,
  logger: Pick<Logger, 'warn'>,
  input: {
    retrieval?: BrainRetrievalService
    target: CampaignBrainPreloadTarget | null
    extraTargets?: CampaignBrainPreloadTarget[]
    timingMeta: BrainContextTimingMeta
    userId: string
    orgId?: string | null
    query?: string
    agentKey?: string
    precomputedEmbedding?: PrecomputedEmbedding
    onRetrievalReceipt?: (receipt: BrainRetrievalReceipt) => void
  },
): Promise<string> {
  const targets = [...(input.target ? [input.target] : []), ...(input.extraTargets ?? [])]
  if (targets.length === 0) return Promise.resolve('')
  return support.timeContextPart(
    'campaign_context',
    input.timingMeta,
    async () => {
      const parts: string[] = []
      for (const target of targets) {
        const part = await buildCampaignBrainContext(support, { ...input, target }).catch((err) => {
          logger.warn(`Campaign brain context failed: ${err}`)
          return ''
        })
        if (part) parts.push(part)
      }
      return parts.join('\n\n')
    },
    (value) => support.contextStringTiming(value),
  )
}
