import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionWorkerBillingClientService } from '../../../provider-billing/mission-worker-billing-client.service'
import { AgentRuntimeService } from '../agent-runtime.service'

const GEMINI_EMBEDDING_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent'
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'

@Injectable()
export class MissionContextService {
  private readonly logger = new Logger(MissionContextService.name)
  private static readonly KNOWLEDGE_MATCH_THRESHOLD = 0.58
  private static readonly DEFAULT_KNOWLEDGE_DOMAINS: Record<string, string[]> = {
    ceo: ['strategy', 'marketing', 'finance', 'operations', 'creative', 'general'],
    cfo: ['finance', 'operations', 'strategy', 'general'],
    copywriter: ['marketing', 'creative', 'general'],
    designer: ['creative', 'general'],
    analyst: ['marketing', 'finance', 'general'],
    developer: ['creative', 'general'],
    pm_marketing: ['strategy', 'marketing', 'creative', 'general'],
    pm_product: ['strategy', 'operations', 'creative', 'general'],
    pm_operations: ['strategy', 'operations', 'finance', 'general'],
    product_manager: ['strategy', 'operations', 'creative', 'general'],
    automation_integrations_engineer: ['operations', 'creative', 'general'],
    qa_engineer: ['operations', 'creative', 'general'],
    media_producer: ['marketing', 'creative', 'general'],
    brand_manager: ['marketing', 'creative', 'general'],
    coach: ['strategy', 'operations', 'general'],
    widget_builder: ['creative', 'general'],
    customer_support: ['operations', 'general'],
    customer_success: ['strategy', 'operations', 'general'],
    customer_coach: ['strategy', 'operations', 'general'],
    brain_scholar: ['strategy', 'marketing', 'finance', 'operations', 'creative', 'general'],
    ads_manager: ['marketing', 'finance', 'creative', 'general'],
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly agentRuntime: AgentRuntimeService,
    @Optional() private readonly billingClient?: MissionWorkerBillingClientService,
  ) {}

  async buildCampaignContext(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    agentKey: string,
    graphQueryOverride?: string,
  ): Promise<string> {
    const missionOrgId = (mission.org_id as string | null) ?? null
    const identityParts = await this.buildAgentIdentityContext(
      supabase,
      mission.user_id,
      agentKey,
      missionOrgId,
    )
    if (!mission.campaign_id) return identityParts

    const agentLevel = await this.getAgentLevel(supabase, mission.user_id, agentKey, missionOrgId)
    const graphQuery = graphQueryOverride || mission.brief || mission.title || ''

    const agentRecord = await this.getOrCreateCampaignAgent(
      supabase,
      mission.campaign_id,
      mission.user_id,
      agentKey,
      missionOrgId,
    )
    const agentConfig = (agentRecord.config || {}) as Record<string, unknown>
    const agentDomains = (
      Array.isArray(agentConfig.knowledge_domains) ? agentConfig.knowledge_domains : null
    ) as string[] | null

    const [
      { data: campaign },
      { data: offers },
      { data: avatarRows },
      { data: recentDeliverables },
      graphContext,
    ] = await Promise.all([
      supabase
        .from('campaigns')
        .select('name, context, resources, current_priorities, config')
        .eq('id', mission.campaign_id)
        .single(),
      agentLevel === 'employee'
        ? Promise.resolve({ data: null })
        : supabase
            .from('offers')
            .select('name, step1_data, step2_data')
            .eq('campaign_id', mission.campaign_id)
            .limit(3),
      supabase
        .from('avatars')
        .select('name, persona_data')
        .eq('campaign_id', mission.campaign_id)
        .limit(3),
      agentLevel === 'employee'
        ? Promise.resolve({ data: null })
        : supabase
            .from('mission_deliverables')
            .select('title, type, created_at')
            .eq('campaign_id', mission.campaign_id)
            .order('created_at', { ascending: false })
            .limit(10),
      this.getCampaignGraphContext(
        supabase,
        mission.campaign_id,
        mission.user_id,
        graphQuery,
        agentLevel,
        missionOrgId,
        agentDomains ?? undefined,
      ),
    ])
    const agentMemory = agentRecord

    if (!campaign) return identityParts

    const ctx = (campaign.context || {}) as Record<string, string>
    const res = (campaign.resources || {}) as Record<string, string | null>
    const priorities = (campaign.current_priorities || []) as string[]
    const learned = ((agentMemory.memory as any)?.learned || []) as Array<{ note: string }>

    const parts: string[] = []
    parts.push(`\n\nCAMPAIGN: ${campaign.name}`)

    if (ctx.purpose || ctx.result || ctx.description) {
      parts.push('\nCAMPAIGN CONTEXT:')
      if (ctx.purpose) parts.push(`- Purpose: ${ctx.purpose}`)
      if (ctx.description) parts.push(`- Description: ${ctx.description}`)
      if (ctx.target_audience) parts.push(`- Target Audience: ${ctx.target_audience}`)
      if (agentLevel !== 'employee') {
        if (ctx.result) parts.push(`- Result: ${ctx.result}`)
        if (ctx.strategy) parts.push(`- Strategy: ${ctx.strategy}`)
        const offLimits = Array.isArray((campaign.context as any)?.off_limits)
          ? ((campaign.context as any).off_limits as string[])
          : []
        if (offLimits.length > 0) {
          parts.push('- Off-Limits (CEO must not do these autonomously):')
          for (const rule of offLimits) parts.push(`  * ${rule}`)
        }
        if (ctx.industry) parts.push(`- Industry: ${ctx.industry}`)
        if (ctx.products_services) parts.push(`- Products/Services: ${ctx.products_services}`)
        if (ctx.competitors) parts.push(`- Competitors: ${ctx.competitors}`)
        if (ctx.positioning) parts.push(`- Positioning: ${ctx.positioning}`)
      }
    }

    if (agentLevel !== 'employee' && offers && offers.length > 0) {
      parts.push('\nOFFER INTELLIGENCE:')
      for (const offer of offers) {
        const s1 = (offer.step1_data || {}) as Record<string, unknown>
        const s2 = (offer.step2_data || {}) as Record<string, unknown>

        const whatWeSell = this.extractFirstString(s1, [
          'step1_what_we_sell',
          'what_we_sell',
          'what_do_we_sell',
        ])
        const whoWeSellTo = this.extractFirstString(s1, [
          'step1_who_we_sell_to',
          'who_we_sell_to',
          'who_we_sell_it_to',
        ])
        const product = this.extractFirstString(s1, ['step1_product', 'product'])
        const targetMarket = this.extractFirstString(s1, ['step1_target_market', 'target_market'])
        const powerOffer = this.extractFirstString(s2, [
          'step2_power_offer_statement',
          'powerOffer',
        ])
        const majorBenefit = this.extractFirstString(s2, ['step2_major_benefit'])
        const vehicle = this.extractFirstString(s2, ['step2_vehicle'])

        if (offer.name) parts.push(`\nOffer: ${offer.name}`)
        if (whatWeSell) parts.push(`- What We Sell: ${whatWeSell}`)
        if (whoWeSellTo) parts.push(`- Who We Sell To: ${whoWeSellTo}`)
        if (product) parts.push(`- Product: ${product.slice(0, 300)}`)
        if (targetMarket) parts.push(`- Target Market: ${targetMarket.slice(0, 300)}`)
        if (powerOffer) parts.push(`- Power Offer: ${powerOffer}`)
        if (majorBenefit) parts.push(`- Major Benefit: ${majorBenefit}`)
        if (vehicle) parts.push(`- Vehicle: ${vehicle}`)
      }
    }

    if (avatarRows && avatarRows.length > 0) {
      parts.push('\nTARGET AUDIENCE:')
      for (const av of avatarRows) {
        const persona = (av.persona_data || {}) as Record<string, any>
        const demo = (persona.demographics || {}) as Record<string, any>
        const name = demo.name || persona.buyerPersona?.name || av.name || ''
        const coreProblem = persona.core_problem || persona.buyerPersona?.description || ''
        if (name) parts.push(`- Persona: ${name}`)
        if (demo.age) parts.push(`- Age: ${demo.age}`)
        if (coreProblem) parts.push(`- Core Problem: ${String(coreProblem).slice(0, 200)}`)
        if (Array.isArray(demo.key_frustrations) && demo.key_frustrations.length > 0) {
          parts.push(`- Frustrations: ${demo.key_frustrations.slice(0, 3).join(', ')}`)
        }
      }
    }

    const themeData = await this.getCampaignThemeBrandData(supabase, campaign)
    if (themeData) {
      parts.push('\nBRAND VOICE (from Theme):')
      if (themeData.tone) parts.push(`- Tone: ${themeData.tone}`)
      if (themeData.style) parts.push(`- Style: ${themeData.style}`)
      if (themeData.personality) parts.push(`- Personality: ${themeData.personality}`)
      if (themeData.primaryValue) parts.push(`- Primary Value: ${themeData.primaryValue}`)
      if (themeData.tagline) parts.push(`- Tagline: ${themeData.tagline}`)
    } else if (ctx.tone || ctx.voice_attributes || ctx.language_patterns) {
      parts.push('\nBRAND VOICE:')
      if (ctx.tone) parts.push(`- Tone: ${ctx.tone}`)
      if (ctx.voice_attributes) parts.push(`- Voice: ${ctx.voice_attributes}`)
      if (ctx.language_patterns) parts.push(`- Language Patterns: ${ctx.language_patterns}`)
      if (ctx.words_to_use) parts.push(`- Words to Use: ${ctx.words_to_use}`)
      if (ctx.words_to_avoid) parts.push(`- Words to Avoid: ${ctx.words_to_avoid}`)
    }

    if (agentLevel !== 'employee') {
      const activeResources = Object.entries(res).filter(([, v]) => v)
      if (activeResources.length > 0) {
        parts.push('\nRESOURCES:')
        for (const [key, val] of activeResources) {
          parts.push(`- ${key}: ${val}`)
        }
      }

      if (priorities.length > 0) {
        parts.push('\nCURRENT PRIORITIES:')
        for (const p of priorities) parts.push(`- ${p}`)
      }
    }

    if (learned.length > 0) {
      parts.push('\nYOUR MEMORY (from past work on this campaign):')
      for (const l of learned.slice(-10)) parts.push(`- ${l.note}`)
    }

    if (agentLevel !== 'employee' && recentDeliverables && recentDeliverables.length > 0) {
      parts.push('\nRECENT CAMPAIGN DELIVERABLES:')
      for (const d of recentDeliverables) {
        parts.push(`- "${d.title}" (${d.type}, ${new Date(d.created_at).toLocaleDateString()})`)
      }
    }

    if (graphContext) {
      parts.push('\nGRAPH CONTEXT (retrieved by similarity + relationships):')
      parts.push(graphContext)
    }

    return identityParts + parts.join('\n')
  }

  extractTopRelevantCampaignFacts(context: string, maxItems: number): string[] {
    if (!context) return []
    const lines = context
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.replace(/^\-\s*/, ''))
      .filter((line) => line.length > 0)
    return lines.slice(0, maxItems)
  }

  private async getCampaignThemeBrandData(
    supabase: SupabaseClient,
    campaign: Record<string, any>,
  ): Promise<{
    tone?: string
    style?: string
    personality?: string
    primaryValue?: string
    tagline?: string
  } | null> {
    const config = (campaign.config || {}) as Record<string, any>
    const agentSettings = (config.agent_settings || {}) as Record<string, any>
    const themeId = agentSettings.theme_id as string | null | undefined

    if (!themeId) return null

    const themeTables = ['branding_themes', 'themes']
    for (const table of themeTables) {
      try {
        const { data } = await supabase
          .from(table)
          .select('brand_voice, brand_values')
          .eq('id', themeId)
          .maybeSingle()
        if (data) {
          const voice = (data.brand_voice || {}) as Record<string, string>
          const values = (data.brand_values || {}) as Record<string, any>
          return {
            tone: voice.tone,
            style: voice.style,
            personality: voice.personality,
            primaryValue: values.primary,
            tagline: values.tagline,
          }
        }
      } catch {
        continue
      }
    }
    return null
  }

  private async getAgentLevel(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<string> {
    const runtime = await this.agentRuntime.resolveRuntimeAgent(supabase, userId, agentKey, orgId)
    return runtime.level
  }

  private async buildAgentIdentityContext(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<string> {
    let agentRegQuery = supabase.from('agents_registry').select('name').eq('agent_key', agentKey)
    if (orgId) {
      agentRegQuery = agentRegQuery.eq('org_id', orgId).is('user_id', null)
    } else {
      agentRegQuery = agentRegQuery.eq('user_id', userId).is('org_id', null)
    }
    const [{ data: profile }, { data: agentReg }] = await Promise.all([
      supabase.from('profiles').select('full_name, company_name').eq('id', userId).maybeSingle(),
      agentRegQuery.maybeSingle(),
    ])

    const parts: string[] = []

    if (profile?.full_name || profile?.company_name) {
      parts.push('\nUSER:')
      if (profile.full_name) parts.push(`- Name: ${profile.full_name}`)
      if (profile.company_name) parts.push(`- Company: ${profile.company_name}`)
    }

    const displayName = agentReg?.name || agentKey
    parts.push(`\nYOUR IDENTITY:`)
    parts.push(`- Your name is ${displayName}. Your role is ${agentKey}.`)

    return parts.join('\n')
  }

  private extractFirstString(data: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const val = data[key]
      if (Array.isArray(val) && val.length > 0) return String(val[0])
      if (typeof val === 'string' && val.trim()) return val
    }
    return ''
  }

  private async getOrCreateCampaignAgent(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    const { data: existing } = await supabase
      .from('campaign_agents')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('agent_key', agentKey)
      .maybeSingle()

    if (existing) return existing

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('name')
      .eq('id', campaignId)
      .single()

    const agentName = `${campaign?.name || 'Campaign'} ${agentKey.charAt(0).toUpperCase() + agentKey.slice(1)}`
    const knowledgeDomains = MissionContextService.DEFAULT_KNOWLEDGE_DOMAINS[agentKey] ?? [
      'marketing',
      'creative',
      'general',
    ]

    const { data: created, error } = await supabase
      .from('campaign_agents')
      .insert({
        campaign_id: campaignId,
        user_id: userId,
        org_id: orgId ?? null,
        agent_key: agentKey,
        name: agentName,
        config: { knowledge_domains: knowledgeDomains },
      })
      .select('*')
      .single()

    if (error) {
      this.logger.error(`Failed to create campaign agent: ${error.message}`)
      return { memory: {}, config: { knowledge_domains: knowledgeDomains } }
    }
    return created
  }

  private async getCampaignGraphContext(
    supabase: SupabaseClient,
    campaignId: string,
    userId: string,
    query: string,
    agentLevel: string,
    orgId?: string | null,
    agentDomains?: string[],
  ): Promise<string> {
    const embedding = await this.getEmbedding(query)
    if (!embedding) return ''
    await this.logEmbeddingUsage(userId, Math.ceil(query.length / 4), orgId, campaignId)

    const seedLimit = agentLevel === 'c_level' ? 8 : agentLevel === 'manager' ? 6 : 4
    const hopDepth = agentLevel === 'c_level' ? 3 : agentLevel === 'manager' ? 2 : 1

    const rpcParams: Record<string, unknown> = {
      p_campaign_id: campaignId,
      p_query_embedding: JSON.stringify(embedding),
      p_match_count: seedLimit,
      p_match_threshold: MissionContextService.KNOWLEDGE_MATCH_THRESHOLD,
    }
    if (agentDomains && agentDomains.length > 0) rpcParams.p_domains = agentDomains

    const { data: seeds, error: seedsError } = await supabase.rpc('campaign_match_nodes', rpcParams)
    if (seedsError || !seeds || seeds.length === 0) return ''

    const seedIds = seeds.map((s: Record<string, unknown>) => String(s.id))
    const { data: traversed } = await supabase.rpc('campaign_traverse_edges', {
      p_campaign_id: campaignId,
      p_seed_node_ids: seedIds,
      p_max_depth: hopDepth,
      p_min_strength: 0.3,
    })

    const relatedIds = (traversed || []).map((t: Record<string, unknown>) => String(t.node_id))
    const nodeIds = Array.from(new Set([...seedIds, ...relatedIds]))
    if (nodeIds.length === 0) return ''

    const { data: nodes, error: nodesError } = await supabase
      .from('campaign_nodes')
      .select('id, title, content, node_type')
      .in('id', nodeIds)
      .limit(15)
    if (nodesError || !nodes) return ''

    const lines: string[] = []
    for (const node of nodes) {
      lines.push(`- [${node.node_type}] ${node.title}: ${String(node.content || '').slice(0, 220)}`)
    }
    return lines.join('\n')
  }

  private async getEmbedding(text: string): Promise<number[] | null> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY
    if (!apiKey || !text.trim()) return null

    const res = await fetch(`${GEMINI_EMBEDDING_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: text.slice(0, 12000) }] },
        outputDimensionality: 768,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.embedding?.values ?? null
  }

  async logEmbeddingUsage(
    userId: string,
    tokenEstimate: number,
    orgId?: string | null,
    campaignId?: string | null,
  ): Promise<void> {
    if (tokenEstimate <= 0) return
    if (!this.billingClient) {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('mission_worker_billing_client_not_configured')
    }
    await this.billingClient.chargeDirectTextUsage({
      userId,
      orgId,
      campaignId,
      feature: 'mission',
      action: 'context_embedding',
      modelName: GEMINI_EMBEDDING_MODEL,
      usage: {
        input: tokenEstimate,
        output: 0,
        totalTokens: tokenEstimate,
      },
      costSource: 'char_estimate',
      metadata: { source: 'mission_context' },
    })
  }
}
