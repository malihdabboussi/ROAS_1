import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient, type RequestScope } from '@vibey/api-shared'
import type {
  DailyRecommendationFacts,
  DailyRecommendationKey,
  DailyRecommendationTier,
} from '../config/daily-recommendation-rules'

@Injectable()
export class DailyRecommendationRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async fetchTierFacts(
    tier: DailyRecommendationTier,
    scope: RequestScope,
  ): Promise<DailyRecommendationFacts> {
    if (tier === 1) return this.fetchTier1Facts(scope)
    if (tier === 2) return this.fetchTier2Facts(scope)
    return this.fetchTier3Facts(scope)
  }

  private async fetchTier1Facts(scope: RequestScope): Promise<DailyRecommendationFacts> {
    const defaultBrain = await this.findDefaultUserBrain(scope.userId)

    const [customerBrainEnabled, defaultBrainMemoryCount, companyCortex] = await Promise.all([
      this.findCustomerBrainEnabled(scope),
      defaultBrain ? this.countMemories(defaultBrain.id) : Promise.resolve(0),
      scope.orgId ? this.findCompanyCortexFacts(scope.orgId) : Promise.resolve(null),
    ])

    return {
      customerBrainEnabled,
      defaultBrainId: defaultBrain?.id ?? null,
      defaultBrainCortexMax: defaultBrain?.cortex_max === true,
      defaultBrainMemoryCount,
      ...(companyCortex ?? {}),
    }
  }

  private async fetchTier2Facts(scope: RequestScope): Promise<DailyRecommendationFacts> {
    const [
      connectedIntegrationCount,
      slackMappingCount,
      telegramChannelCount,
      emailSendCount,
      verifiedEmailDomainCount,
      publishedFunnelCount,
      customDomainCount,
    ] = await Promise.all([
      // user_integrations is user-scoped only (no org_id column).
      this.countRows(
        this.svc.client
          .from('user_integrations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', scope.userId)
          .eq('status', 'connected'),
        'user_integrations',
      ),
      this.countRows(
        this.applyHybridScope(
          this.svc.client.from('slack_brain_mappings').select('id', { count: 'exact', head: true }),
          scope,
        ),
        'slack_brain_mappings',
      ),
      this.countRows(
        this.applyHybridScope(
          this.svc.client
            .from('agent_channels')
            .select('id', { count: 'exact', head: true })
            .eq('channel_type', 'telegram'),
          scope,
        ),
        'agent_channels',
      ),
      this.countRows(
        this.applyHybridScope(
          this.svc.client.from('email_sends').select('id', { count: 'exact', head: true }),
          scope,
        ),
        'email_sends',
      ),
      // email_domains is user-scoped only.
      this.countRows(
        this.svc.client
          .from('email_domains')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', scope.userId)
          .eq('status', 'verified'),
        'email_domains',
      ),
      this.countPublishedFunnels(scope.userId),
      this.countRows(
        this.applyHybridScope(
          this.svc.client.from('domains').select('id', { count: 'exact', head: true }),
          scope,
        ),
        'domains',
      ),
    ])

    return {
      connectedIntegrationCount,
      slackMappingCount,
      telegramChannelCount,
      emailSendCount,
      verifiedEmailDomainCount,
      publishedFunnelCount,
      customDomainCount,
    }
  }

  private async fetchTier3Facts(scope: RequestScope): Promise<DailyRecommendationFacts> {
    const [
      spaceCount,
      enabledAutomationCount,
      publishedFunnelCount,
      contactCount,
      formCount,
      customSkillCount,
      orgFacts,
    ] = await Promise.all([
      this.countRows(
        this.applyHybridScope(
          this.svc.client.from('spaces').select('id', { count: 'exact', head: true }),
          scope,
        ),
        'spaces',
      ),
      this.countRows(
        this.applyHybridScope(
          this.svc.client
            .from('space_automations')
            .select('id', { count: 'exact', head: true })
            .eq('enabled', true)
            .eq('is_draft', false),
          scope,
        ),
        'space_automations',
      ),
      this.countPublishedFunnels(scope.userId),
      this.countRows(
        this.applyHybridScope(
          this.svc.client.from('contacts').select('id', { count: 'exact', head: true }),
          scope,
        ),
        'contacts',
      ),
      this.countRows(
        this.applyHybridScope(
          this.svc.client.from('forms').select('id', { count: 'exact', head: true }),
          scope,
        ),
        'forms',
      ),
      this.countRows(
        this.applyHybridScope(
          this.svc.client
            .from('agent_skills')
            .select('id', { count: 'exact', head: true })
            .eq('source', 'user'),
          scope,
        ),
        'agent_skills',
      ),
      scope.orgId ? this.findOrgMembershipFacts(scope.orgId) : Promise.resolve(null),
    ])

    return {
      spaceCount,
      enabledAutomationCount,
      publishedFunnelCount,
      contactCount,
      formCount,
      customSkillCount,
      ...(orgFacts ?? {}),
    }
  }

  async listActiveSnoozedKeys(scope: RequestScope): Promise<Set<DailyRecommendationKey>> {
    const { data, error } = await this.svc.client
      .from('home_recommendation_dismissals')
      .select('recommendation_key')
      .eq('user_id', scope.userId)
      .eq('scope_key', scope.orgId ?? 'personal')
      .gt('snoozed_until', new Date().toISOString())
    if (error) throw new Error(`Failed to load recommendation dismissals: ${error.message}`)
    return new Set((data ?? []).map((row) => row.recommendation_key as DailyRecommendationKey))
  }

  async upsertDismissal(
    scope: RequestScope,
    key: DailyRecommendationKey,
    snoozedUntil: string,
  ): Promise<void> {
    const { error } = await this.svc.client.from('home_recommendation_dismissals').upsert(
      {
        user_id: scope.userId,
        org_id: scope.orgId,
        recommendation_key: key,
        dismissed_at: new Date().toISOString(),
        snoozed_until: snoozedUntil,
      },
      { onConflict: 'user_id,scope_key,recommendation_key' },
    )
    if (error) throw new Error(`Failed to dismiss recommendation: ${error.message}`)
  }

  // Hybrid multi-tenancy scoping: org context filters by org_id; personal context
  // filters by user_id with org_id null (pattern: domains.repository.ts).
  private applyHybridScope<T extends { eq: any; is: any }>(query: T, scope: RequestScope): T {
    if (scope.orgId) return query.eq('org_id', scope.orgId)
    return query.eq('user_id', scope.userId).is('org_id', null)
  }

  private async countRows(query: PromiseLike<any>, table: string): Promise<number> {
    const { count, error } = await query
    if (error) throw new Error(`Failed to count ${table}: ${error.message}`)
    return count ?? 0
  }

  // funnels has no org_id column — always creator-scoped.
  private countPublishedFunnels(userId: string): Promise<number> {
    return this.countRows(
      this.svc.client
        .from('funnels')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'published'),
      'funnels',
    )
  }

  private async findDefaultUserBrain(
    userId: string,
  ): Promise<{ id: string; cortex_max: boolean | null } | null> {
    const { data, error } = await this.svc.client
      .from('ns_brains')
      .select('id, cortex_max')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
    if (error) throw new Error(`Failed to load default brain: ${error.message}`)
    return data?.[0] ?? null
  }

  private async findCustomerBrainEnabled(scope: RequestScope): Promise<boolean> {
    let query = this.svc.client.from('ns_brains').select('id, cortex_max').eq('scope', 'customer')
    query = scope.orgId
      ? query.eq('org_id', scope.orgId)
      : query.eq('owner_id', scope.userId).is('org_id', null)
    const { data, error } = await query.limit(1).maybeSingle()
    if (error) throw new Error(`Failed to load customer brain: ${error.message}`)
    return data?.cortex_max === true
  }

  private async countMemories(brainId: string): Promise<number> {
    return this.countRows(
      this.svc.client
        .from('ns_memories')
        .select('id', { count: 'exact', head: true })
        .eq('brain_id', brainId),
      'ns_memories',
    )
  }

  private async findCompanyCortexFacts(orgId: string): Promise<DailyRecommendationFacts> {
    const [settingsResult, proposedSignalCount, orgResult] = await Promise.all([
      this.svc.client
        .from('company_cortex_settings')
        .select('enabled, schedule')
        .eq('org_id', orgId)
        .maybeSingle(),
      this.countRows(
        this.svc.client
          .from('company_cortex_signals')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'proposed'),
        'company_cortex_signals',
      ),
      this.svc.client.from('organizations').select('settings').eq('id', orgId).maybeSingle(),
    ])

    if (settingsResult.error) {
      throw new Error(`Failed to load company cortex settings: ${settingsResult.error.message}`)
    }
    if (orgResult.error) {
      throw new Error(`Failed to load organization settings: ${orgResult.error.message}`)
    }

    // Same settings key as skill-recommendations.service.ts (SETTINGS_KEY); duplicated
    // here intentionally to avoid a cross-module dependency for one string.
    const orgSettings =
      orgResult.data?.settings &&
      typeof orgResult.data.settings === 'object' &&
      !Array.isArray(orgResult.data.settings)
        ? (orgResult.data.settings as Record<string, any>)
        : {}
    const skillRecSettings = orgSettings['skill_recommendations']

    return {
      companyCortexEnabled: settingsResult.data?.enabled === true,
      companyCortexSchedule: settingsResult.data?.schedule ?? 'manual_only',
      proposedSignalCount,
      skillRecommendationsEnabled:
        skillRecSettings && typeof skillRecSettings === 'object'
          ? skillRecSettings.enabled === true
          : false,
    }
  }

  private async findOrgMembershipFacts(orgId: string): Promise<DailyRecommendationFacts> {
    const [activeOrgMemberCount, pendingInviteCount] = await Promise.all([
      this.countRows(
        this.svc.client
          .from('org_members')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'active'),
        'org_members',
      ),
      this.countRows(
        this.svc.client
          .from('org_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'pending'),
        'org_invitations',
      ),
    ])
    return { activeOrgMemberCount, pendingInviteCount }
  }
}
