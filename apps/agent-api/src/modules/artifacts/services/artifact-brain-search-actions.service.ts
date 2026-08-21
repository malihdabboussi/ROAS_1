import { Injectable } from '@nestjs/common'
import {
  receiptsFromFamilySearchHits,
  toBrainRetrievalReceipt,
} from '../../brain/services/brain-retrieval-receipt'
import { ArtifactBrainScholarRepository } from '../repositories/artifact-brain-scholar.repository'
import { ArtifactBrainAccessService } from './artifact-brain-access.service'

@Injectable()
export class ArtifactBrainSearchActionsService {
  constructor(
    private readonly brainScholarRepository: ArtifactBrainScholarRepository = new ArtifactBrainScholarRepository(),
    private readonly brainAccessService: ArtifactBrainAccessService = new ArtifactBrainAccessService(),
  ) {}

  async searchBrainContext(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const query = String(input.query ?? '').trim()
    if (!query) return { success: false, error: 'query is required' }
    if (!target.brainRetrievalService || typeof target.getUserClient !== 'function') {
      return { success: false, error: 'Brain retrieval service is unavailable' }
    }

    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const callerAgentKey =
      typeof target.parseAgentIdFromSessionKey === 'function' && sessionKey
        ? (target.parseAgentIdFromSessionKey(sessionKey) ?? null)
        : null
    const userClient = await target.getUserClient(userId, sessionKey as string)
    const requestedFamilies = this.parseBrainFamilies(input.families)
    const requestedBrainIds = this.parseStringArray(input.brain_ids ?? input.brainIds)
    const limit = typeof input.limit === 'number' ? Math.min(Math.max(input.limit, 1), 50) : 10

    const allowedFamilies = await this.resolveAllowedBrainSearchFamilies(
      target,
      callerAgentKey,
      orgId,
      userId,
      sessionKey,
    )
    if (allowedFamilies.size === 0) {
      return {
        success: false,
        error: 'No Brain families are accessible for this agent.',
      }
    }

    if (
      requestedFamilies.length > 0 &&
      requestedFamilies.every((family) => !allowedFamilies.has(family))
    ) {
      return {
        success: false,
        error: `Requested Brain families are not accessible: ${requestedFamilies.join(', ')}`,
      }
    }

    const brains = await this.resolveSearchableBrainRows(target, userId, orgId, requestedBrainIds)
    const filteredBrains = brains.filter((brain) => {
      const family = this.familyForBrainScope(brain.scope)
      if (!family) return false
      if (!allowedFamilies.has(family)) return false
      if (
        family === 'agent' &&
        callerAgentKey &&
        brain.agent_id &&
        brain.agent_id !== callerAgentKey
      ) {
        return false
      }
      if (requestedFamilies.length > 0 && !requestedFamilies.includes(family)) return false
      if (requestedBrainIds.length > 0 && !requestedBrainIds.includes(brain.id)) return false
      return true
    })

    if (filteredBrains.length === 0) {
      return {
        success: true,
        query,
        searched_brain_count: 0,
        count: 0,
        context_sufficient: false,
        missing: ['No accessible Brain rows matched this search.'],
        suggested_next_queries: [query],
        by_family: {},
        allowed_families: Array.from(allowedFamilies),
        results: [],
      }
    }

    const searches = await Promise.all(
      filteredBrains.map(async (brain) => {
        const family = this.familyForBrainScope(brain.scope)
        if (!family) return null
        try {
          const result = await target.brainRetrievalService.search({
            supabase: target.serviceClient,
            userClient,
            family,
            brainId: brain.id,
            query,
            userId,
            orgId: brain.org_id ?? orgId,
            requiredAccess: 'query',
            limit,
            ...this.temporalSearchInput(input),
          })
          return { brain, family, result }
        } catch {
          return null
        }
      }),
    )

    const successful = searches.filter(
      (
        item,
      ): item is {
        brain: { id: string; scope: string; org_id: string | null; agent_id: string | null }
        family: 'user' | 'agent' | 'customer' | 'company'
        result: Record<string, any>
      } => Boolean(item),
    )
    const mergedResults = successful
      .flatMap((item) => item.result.results ?? [])
      .sort((a, b) => Number(b.scores?.final ?? 0) - Number(a.scores?.final ?? 0))
      .slice(0, limit)
    const byFamily = successful.reduce<Record<string, { count: number; brain_ids: string[] }>>(
      (acc, item) => {
        const current = acc[item.family] ?? { count: 0, brain_ids: [] }
        current.count += Number(item.result.count ?? 0)
        current.brain_ids.push(item.brain.id)
        acc[item.family] = current
        return acc
      },
      {},
    )
    const contextSufficient = successful.some((item) => item.result.context_sufficient === true)
    const missing = [
      ...new Set(
        successful.flatMap((item) =>
          Array.isArray(item.result.missing) ? item.result.missing : [],
        ),
      ),
    ]
    const suggestedNextQueries = [
      ...new Set(
        successful.flatMap((item) =>
          Array.isArray(item.result.suggested_next_queries)
            ? item.result.suggested_next_queries
            : [],
        ),
      ),
    ]

    return {
      success: true,
      query,
      searched_brain_count: filteredBrains.length,
      count: mergedResults.length,
      context_sufficient: contextSufficient,
      missing,
      suggested_next_queries: suggestedNextQueries,
      by_family: byFamily,
      allowed_families: Array.from(allowedFamilies),
      results: mergedResults,
      retrieval_receipts: receiptsFromFamilySearchHits(query, successful),
    }
  }

  /**
   * Search ns_memories on the campaign-scoped brain for a campaign.
   * Intentional product override of Phase 2 Campaign Brain removal: agency
   * workflows ingest client packages into campaign brains and hireable agents
   * must be able to read them (e.g. Strategist pre-call maps).
   */
  async searchCampaignBrain(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const query = String(input.query ?? '').trim()
    if (query.length < 3) return { success: false, error: 'query is required (min 3 chars)' }

    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const limit = typeof input.limit === 'number' ? Math.min(Math.max(input.limit, 1), 50) : 10

    const resolved = await this.resolveCampaignBrainId(target, input, userId, orgId, sessionKey)
    if ('error' in resolved) return { success: false, error: resolved.error }
    const { brainId, campaignId } = resolved
    const campaignName = String(input.campaign_name ?? input.campaignName ?? '').trim()

    if (!target.brainRetrievalService || typeof target.getUserClient !== 'function') {
      return { success: false, error: 'Brain retrieval service is unavailable' }
    }

    const userClient = await target.getUserClient(userId, sessionKey as string)
    // Memory lane uses family 'user' regardless of ns_brains.scope; brainId pins the campaign brain.
    const result = await target.brainRetrievalService.search({
      supabase: target.serviceClient,
      userClient,
      family: 'user',
      brainId,
      query,
      userId,
      orgId,
      requiredAccess: 'query',
      limit,
      ...this.temporalSearchInput(input),
    })

    return {
      ...result,
      success: result?.success !== false,
      brain_id: brainId,
      campaign_id: campaignId,
      family: 'campaign',
      retrieval_receipts: [
        toBrainRetrievalReceipt({
          brainId,
          brainName: campaignName || null,
          scope: 'campaign',
          query,
          resultsCount: Number(result?.count ?? 0),
          results: result?.results,
        }),
      ],
    }
  }

  private async resolveCampaignBrainId(
    target: Record<string, any>,
    input: Record<string, unknown>,
    userId: string,
    orgId: string | null,
    sessionKey?: string,
  ): Promise<{ brainId: string; campaignId: string } | { error: string }> {
    const explicitBrainId = String(input.brain_id ?? '').trim()
    let campaignId = String(input.campaign_id ?? '').trim()
    const campaignName = String(input.campaign_name ?? input.campaignName ?? '').trim()

    // Prefer explicit ids/names over session scope so General chats can still
    // read a client campaign brain (search_campaign_brain is cross-scope).
    let nameLookupError: string | null = null
    if (
      !campaignId &&
      campaignName &&
      typeof target.resolveCampaignIdByNameReadOnly === 'function'
    ) {
      try {
        const resolved = await target.resolveCampaignIdByNameReadOnly(
          target.serviceClient,
          userId,
          campaignName,
          orgId,
        )
        if (typeof resolved === 'string' && resolved.trim()) campaignId = resolved.trim()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : `Failed to resolve campaign_name: ${campaignName}`
        // Ambiguity needs the human; an unknown name falls through to the
        // conversation's bound campaign. Returning "not found" here is what a
        // model narrates as "the Brain has nothing on <client>" — while the
        // bound campaign brain is sitting right there.
        if (message.includes('ambiguous')) return { error: message }
        nameLookupError = message
      }
    }

    if (!campaignId && typeof target.resolveCampaignId === 'function') {
      try {
        const resolved = await target.resolveCampaignId(
          target.serviceClient,
          input,
          userId,
          sessionKey,
        )
        if (typeof resolved === 'string' && resolved.trim()) campaignId = resolved.trim()
      } catch {
        // fall through
      }
    }

    if (explicitBrainId) {
      const { data: brain, error } = await target.serviceClient
        .from('ns_brains')
        .select('id, campaign_id, scope, owner_id, org_id')
        .eq('id', explicitBrainId)
        .maybeSingle()
      if (error) return { error: `Failed to load brain: ${error.message}` }
      if (!brain) return { error: `Brain not found: ${explicitBrainId}` }
      const brainCampaignId =
        typeof brain.campaign_id === 'string' && brain.campaign_id.trim()
          ? brain.campaign_id.trim()
          : ''
      if (!brainCampaignId && brain.scope !== 'campaign') {
        return {
          error:
            'brain_id must point at a campaign brain. Use search_agent_brain / search_user_brain / search_customer_brain for other families.',
        }
      }
      const resolvedCampaignId = brainCampaignId || campaignId
      if (!resolvedCampaignId) {
        return { error: 'campaign_id is required when brain_id has no campaign_id link' }
      }
      const generalBlock = await this.rejectIfGeneralCampaign(
        target,
        userId,
        orgId,
        resolvedCampaignId,
      )
      if (generalBlock) return generalBlock
      const access = await this.assertCampaignReadable(target, userId, orgId, resolvedCampaignId)
      if (access) return access
      await this.bindNamedClientConversation(target, input, userId, sessionKey, resolvedCampaignId)
      return { brainId: brain.id as string, campaignId: resolvedCampaignId }
    }

    if (!campaignId) {
      return {
        error:
          nameLookupError ??
          'campaign_id (or campaign_name) is required. Client package knowledge is not on General — pass the client campaign id/name or open that campaign chat.',
      }
    }

    const generalBlock = await this.rejectIfGeneralCampaign(target, userId, orgId, campaignId)
    if (generalBlock) return generalBlock

    const access = await this.assertCampaignReadable(target, userId, orgId, campaignId)
    if (access) return access

    await this.bindNamedClientConversation(target, input, userId, sessionKey, campaignId)

    const { data: brain, error } = await target.serviceClient
      .from('ns_brains')
      .select('id')
      .eq('campaign_id', campaignId)
      .maybeSingle()
    if (error) return { error: `Failed to resolve campaign brain: ${error.message}` }
    if (!brain?.id) {
      return {
        error: `No campaign brain found for campaign_id ${campaignId}. Ingest or open Campaign Knowledge first.`,
      }
    }
    return { brainId: brain.id as string, campaignId }
  }

  private async bindNamedClientConversation(
    target: Record<string, any>,
    input: Record<string, unknown>,
    userId: string,
    sessionKey: string | undefined,
    campaignId: string,
  ): Promise<void> {
    const namedLookup = Boolean(
      String(input.campaign_id ?? '').trim() ||
      String(input.campaign_name ?? input.campaignName ?? '').trim(),
    )
    if (!namedLookup || typeof target.bindConversationToNamedCampaign !== 'function') return
    try {
      await target.bindConversationToNamedCampaign(
        target.serviceClient,
        userId,
        sessionKey,
        campaignId,
      )
    } catch {
      // Lookup still succeeds if CONNECTIONS bind fails.
    }
  }

  private async rejectIfGeneralCampaign(
    target: Record<string, any>,
    userId: string,
    orgId: string | null,
    campaignId: string,
  ): Promise<{ error: string } | null> {
    let query = target.serviceClient
      .from('campaigns')
      .select('id, name, config')
      .eq('id', campaignId)
    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.eq('user_id', userId)
    }
    const { data, error } = await query.maybeSingle()
    if (error || !data) return null
    const config =
      data.config && typeof data.config === 'object' && !Array.isArray(data.config)
        ? (data.config as Record<string, unknown>)
        : {}
    const name = String(data.name ?? '')
      .trim()
      .toLowerCase()
    const isGeneral =
      name === 'general' ||
      config.system_kind === 'general' ||
      config.is_general === true ||
      config.isSystemGeneral === true
    if (!isGeneral) return null
    return {
      error:
        'search_campaign_brain cannot use the General campaign — client packages live on campaign brains (e.g. Impact). Pass campaign_id or campaign_name for the client campaign, or open that campaign chat. Do not use search_agent_brain / search_user_brain for client intake.',
    }
  }

  private async assertCampaignReadable(
    target: Record<string, any>,
    userId: string,
    orgId: string | null,
    campaignId: string,
  ): Promise<{ error: string } | null> {
    let query = target.serviceClient.from('campaigns').select('id').eq('id', campaignId)
    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.eq('user_id', userId)
    }
    const { data, error } = await query.maybeSingle()
    if (error) return { error: `Failed to verify campaign access: ${error.message}` }
    if (!data) return { error: `Campaign not found or not accessible: ${campaignId}` }
    return null
  }

  async searchSkEntries(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const query = String(input.query ?? '').trim()
    if (!query) return { success: false, error: 'query is required' }

    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const resolved = await this.brainAccessService.resolveReadableAgentBrainId(
      target,
      userId,
      input,
      sessionKey,
    )
    if ('error' in resolved) {
      return {
        success: false,
        error: resolved.error,
      }
    }
    const { brainId } = resolved
    if (!brainId) return { success: false, error: 'Agent Brain is not provisioned.' }
    if (target.brainRetrievalService && typeof target.getUserClient === 'function') {
      const userClient = await target.getUserClient(userId, sessionKey as string)
      return target.brainRetrievalService.search({
        supabase: target.serviceClient,
        userClient,
        family: 'agent',
        brainId,
        query,
        userId,
        orgId,
        requiredAccess: 'query',
        limit: Number(input.limit ?? 10),
        ...this.temporalSearchInput(input),
      })
    }
    const access = await this.brainAccessService.assertCanAccessBrain(
      target,
      userId,
      brainId,
      'query',
      sessionKey,
    )
    if (access) return access

    const embedding = await target.embeddingService.getEmbedding(query, {
      billing: { userId, orgId },
    })
    if (!embedding) return { success: false, error: 'Failed to generate search embedding' }

    const { data, error } = await this.brainScholarRepository.searchSkEntries(
      target.serviceClient,
      {
        brainId,
        queryEmbedding: `[${embedding.join(',')}]`,
        matchCount: Number(input.limit ?? 10),
        domain: typeof input.domain === 'string' ? input.domain.trim() || null : null,
      },
    )
    if (error) return { success: false, error: `SK search failed: ${error.message}` }

    return { success: true, query, count: (data ?? []).length, results: data ?? [] }
  }

  private async resolveAllowedBrainSearchFamilies(
    target: Record<string, any>,
    callerAgentKey: string | null,
    orgId: string | null,
    userId: string,
    sessionKey?: string,
  ): Promise<Set<'user' | 'agent' | 'customer' | 'company'>> {
    if (typeof sessionKey === 'string' && sessionKey.includes('::mcp:')) {
      return new Set(['user', 'agent', 'customer', 'company'])
    }
    if (
      !callerAgentKey ||
      typeof target.agentPolicyService?.listAllowedBrainSearchFamilies !== 'function'
    ) {
      return new Set(['user', 'agent', 'customer', 'company'])
    }
    const scope = { orgId, userId: orgId ? null : userId }
    const families = await target.agentPolicyService.listAllowedBrainSearchFamilies(
      callerAgentKey,
      scope,
    )
    return new Set(families)
  }

  private parseBrainFamilies(value: unknown): Array<'user' | 'agent' | 'customer' | 'company'> {
    if (!Array.isArray(value)) return []
    const allowed = new Set(['user', 'agent', 'customer', 'company'])
    return value
      .map((item) => String(item).trim())
      .filter((item): item is 'user' | 'agent' | 'customer' | 'company' => allowed.has(item))
  }

  private parseStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  private temporalSearchInput(input: Record<string, unknown>): Record<string, unknown> {
    const timeMode = typeof input.time_mode === 'string' ? input.time_mode.trim() : ''
    const asOf = typeof input.as_of === 'string' ? input.as_of.trim() : ''
    const occurredFrom = typeof input.occurred_from === 'string' ? input.occurred_from.trim() : ''
    const occurredTo = typeof input.occurred_to === 'string' ? input.occurred_to.trim() : ''
    return {
      ...(timeMode ? { time_mode: timeMode } : {}),
      ...(asOf ? { as_of: asOf } : {}),
      ...(occurredFrom ? { occurred_from: occurredFrom } : {}),
      ...(occurredTo ? { occurred_to: occurredTo } : {}),
      ...(typeof input.include_historical === 'boolean'
        ? { include_historical: input.include_historical }
        : {}),
    }
  }

  private familyForBrainScope(scope: string): 'user' | 'agent' | 'customer' | 'company' | null {
    if (scope === 'user' || scope === 'agent' || scope === 'customer' || scope === 'company') {
      return scope
    }
    return null
  }

  private async resolveSearchableBrainRows(
    target: Record<string, any>,
    userId: string,
    orgId: string | null,
    explicitBrainIds: string[],
  ): Promise<Array<{ id: string; scope: string; org_id: string | null; agent_id: string | null }>> {
    if (explicitBrainIds.length > 0) {
      const { data, error } = await this.brainScholarRepository.listBrainsByIds(
        target.serviceClient,
        explicitBrainIds,
      )
      if (error) throw new Error(`Failed to load requested brains: ${error.message}`)
      return (data ?? []) as Array<{
        id: string
        scope: string
        org_id: string | null
        agent_id: string | null
      }>
    }

    const personal = this.brainScholarRepository.listPersonalBrains(target.serviceClient, userId)
    const org = orgId
      ? this.brainScholarRepository.listOrgBrains(target.serviceClient, orgId)
      : Promise.resolve({ data: [], error: null })

    const [personalResult, orgResult] = await Promise.all([personal, org])
    if (personalResult.error)
      throw new Error(`Failed to load personal brains: ${personalResult.error.message}`)
    if (orgResult.error) throw new Error(`Failed to load org brains: ${orgResult.error.message}`)
    const rows = [...(personalResult.data ?? []), ...(orgResult.data ?? [])] as Array<{
      id: string
      scope: string
      org_id: string | null
      agent_id: string | null
    }>
    return [...new Map(rows.map((row) => [row.id, row])).values()]
  }
}
