import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { resolveMachineProfileColumns, resolveMachineProfileRow } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { AdminRepository } from '../repositories/admin.repository'
import {
  buildDailyUsage,
  buildFeatureBreakdown,
  buildFlags,
  buildModelBreakdown,
  buildRecentEvents,
  mergeSummaries,
  summarizeUsage,
  type AdminAccountSummary,
  type UsageRow,
} from './admin-account-usage-summary'

type AdminAccountKind = 'user' | 'org'

const USAGE_SELECT =
  'id,user_id,org_id,campaign_id,conversation_id,feature,action,provider,model_name,service_type,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,total_tokens,computed_cost,credits_charged,metadata_json,created_at'

@Injectable()
export class AdminAccountDetailService {
  private static readonly PAGE_SIZE = 1000

  private readonly machineColumns = resolveMachineProfileColumns(process.env)

  constructor(
    private readonly repository: AdminRepository,
    private readonly creditsService: CreditsService,
  ) {}

  async getUserDashboard(userId: string, rawDays?: string, rangeOnly = false) {
    this.assertUuid(userId, 'user id')
    const days = this.parseDays(rawDays)
    const { from, to } = this.getDateRange(days)

    if (rangeOnly) {
      return this.buildUserRangeSlice(userId, days, from, to)
    }

    const [profile, authUser, subscription, balance, rangeUsage, lifetimeUsage, creditLedger] =
      await Promise.all([
        this.getUserProfile(userId),
        this.getAuthUser(userId),
        this.getUserSubscription(userId),
        this.creditsService.getBalance(userId),
        this.fetchUsage('user', userId, from, to),
        this.fetchUsage('user', userId),
        this.getPersonalCreditLedger(userId),
      ])

    if (!profile && !authUser) throw new NotFoundException('User not found')

    const lifetimeSummary = summarizeUsage(lifetimeUsage, Math.max(1, lifetimeUsage.length))
    const rangeSummary = summarizeUsage(rangeUsage, days, balance)

    return {
      kind: 'user' as const,
      account: {
        id: userId,
        email: authUser?.email ?? null,
        name: profile?.display_name ?? profile?.full_name ?? null,
        display_name: profile?.display_name ?? null,
        full_name: profile?.full_name ?? null,
        role: profile?.role ?? 'user',
        fly_machine_id: profile?.fly_machine_id ?? null,
        created_at: profile?.created_at ?? authUser?.created_at ?? null,
        updated_at: profile?.updated_at ?? null,
        plan: subscription,
        balance,
        lifetime: lifetimeSummary,
      },
      range: { days, from, to },
      summary: rangeSummary,
      dailyUsage: buildDailyUsage(rangeUsage, days, from),
      featureBreakdown: buildFeatureBreakdown(rangeUsage),
      modelBreakdown: buildModelBreakdown(rangeUsage),
      recentEvents: buildRecentEvents(rangeUsage),
      creditLedger,
      flags: buildFlags(rangeUsage, rangeSummary, balance),
    }
  }

  async getOrgDashboard(orgId: string, rawDays?: string, rangeOnly = false) {
    this.assertUuid(orgId, 'organization id')
    const days = this.parseDays(rawDays)
    const { from, to } = this.getDateRange(days)

    if (rangeOnly) {
      return this.buildOrgRangeSlice(orgId, days, from, to)
    }

    const [org, subscription, balance, rangeUsage, lifetimeUsage, creditLedger, members] =
      await Promise.all([
        this.getOrg(orgId),
        this.getOrgSubscription(orgId),
        this.creditsService.getOrgBalance(orgId),
        this.fetchUsage('org', orgId, from, to),
        this.fetchUsage('org', orgId),
        this.getOrgCreditLedger(orgId),
        this.getOrgMembers(orgId),
      ])

    if (!org) throw new NotFoundException('Organization not found')

    const lifetimeSummary = summarizeUsage(lifetimeUsage, Math.max(1, lifetimeUsage.length))
    const rangeSummary = summarizeUsage(rangeUsage, days, balance)
    const memberUsage = await this.buildOrgMemberUsage(members, rangeUsage)

    return {
      kind: 'org' as const,
      account: {
        ...org,
        plan: subscription,
        balance,
        lifetime: lifetimeSummary,
      },
      range: { days, from, to },
      summary: rangeSummary,
      dailyUsage: buildDailyUsage(rangeUsage, days, from),
      featureBreakdown: buildFeatureBreakdown(rangeUsage),
      modelBreakdown: buildModelBreakdown(rangeUsage),
      recentEvents: buildRecentEvents(rangeUsage),
      creditLedger,
      members: memberUsage,
      flags: buildFlags(rangeUsage, rangeSummary, balance),
    }
  }

  private async buildUserRangeSlice(
    userId: string,
    days: 7 | 14 | 30 | 90,
    from: string,
    to: string,
  ) {
    const [balance, rangeUsage] = await Promise.all([
      this.creditsService.getBalance(userId),
      this.fetchUsage('user', userId, from, to),
    ])
    const rangeSummary = summarizeUsage(rangeUsage, days, balance)

    return {
      rangeOnly: true as const,
      range: { days, from, to },
      summary: rangeSummary,
      dailyUsage: buildDailyUsage(rangeUsage, days, from),
      featureBreakdown: buildFeatureBreakdown(rangeUsage),
      modelBreakdown: buildModelBreakdown(rangeUsage),
      recentEvents: buildRecentEvents(rangeUsage),
      flags: buildFlags(rangeUsage, rangeSummary, balance),
    }
  }

  private async buildOrgRangeSlice(
    orgId: string,
    days: 7 | 14 | 30 | 90,
    from: string,
    to: string,
  ) {
    const [balance, rangeUsage, members] = await Promise.all([
      this.creditsService.getOrgBalance(orgId),
      this.fetchUsage('org', orgId, from, to),
      this.getOrgMembers(orgId),
    ])
    const rangeSummary = summarizeUsage(rangeUsage, days, balance)

    return {
      rangeOnly: true as const,
      range: { days, from, to },
      summary: rangeSummary,
      dailyUsage: buildDailyUsage(rangeUsage, days, from),
      featureBreakdown: buildFeatureBreakdown(rangeUsage),
      modelBreakdown: buildModelBreakdown(rangeUsage),
      recentEvents: buildRecentEvents(rangeUsage),
      memberUsage: this.buildOrgMemberUsageTotals(members, rangeUsage),
      flags: buildFlags(rangeUsage, rangeSummary, balance),
    }
  }

  private parseDays(raw?: string): 7 | 14 | 30 | 90 {
    const days = Number(raw ?? 30)
    if (days === 7 || days === 14 || days === 30 || days === 90) return days
    throw new BadRequestException('days must be 7, 14, 30, or 90')
  }

  private assertUuid(value: string, label: string) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuid.test(value)) throw new BadRequestException(`Invalid ${label}`)
  }

  private getDateRange(days: number) {
    const end = new Date()
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - (days - 1))
    start.setUTCHours(0, 0, 0, 0)
    return { from: start.toISOString(), to: end.toISOString() }
  }

  private async fetchUsage(
    kind: AdminAccountKind,
    id: string,
    from?: string,
    to?: string,
  ): Promise<UsageRow[]> {
    return this.fetchAllByRange((rangeFrom, rangeTo) => {
      let query = this.repository
        .serviceTable('ai_usage_events')
        .select(USAGE_SELECT)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(rangeFrom, rangeTo)

      query = kind === 'org' ? query.eq('org_id', id) : query.eq('user_id', id)
      if (from) query = query.gte('created_at', from)
      if (to) query = query.lte('created_at', to)
      return query
    })
  }

  private async fetchAllByRange(builder: (from: number, to: number) => any): Promise<any[]> {
    const all: any[] = []
    for (let from = 0; ; from += AdminAccountDetailService.PAGE_SIZE) {
      const to = from + AdminAccountDetailService.PAGE_SIZE - 1
      const { data, error } = await builder(from, to)
      if (error) throw error
      const rows = data ?? []
      all.push(...rows)
      if (rows.length < AdminAccountDetailService.PAGE_SIZE) break
    }
    return all
  }

  private async getAuthUser(userId: string) {
    const { data, error } = await this.repository.getAuthUserById(userId)
    if (error) return null
    return {
      email: data.user?.email ?? null,
      created_at: data.user?.created_at ?? null,
    }
  }

  private async getUserProfile(userId: string) {
    const [userProfile, profile] = await Promise.all([
      this.repository
        .serviceTable('user_profiles')
        .select('id, role, display_name, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle(),
      this.repository
        .serviceTable('profiles')
        .select(`id, full_name, ${this.machineColumns.machineId}`)
        .eq('id', userId)
        .maybeSingle(),
    ])

    if (userProfile.error) throw userProfile.error
    if (profile.error) throw profile.error

    const userRow = (userProfile.data ?? {}) as any
    const profileRow = (profile.data ?? {}) as any
    const machineProfile = profile.data
      ? resolveMachineProfileRow(
          profile.data as unknown as Record<string, unknown>,
          this.machineColumns,
        )
      : null
    if (!userProfile.data && !profile.data) return null

    return {
      id: userId,
      role: userRow.role ?? 'user',
      display_name: userRow.display_name ?? null,
      full_name: profileRow.full_name ?? null,
      fly_machine_id: machineProfile?.machineId ?? null,
      created_at: userRow.created_at ?? null,
      updated_at: userRow.updated_at ?? null,
    }
  }

  private async getOrg(orgId: string) {
    const { data, error } = await this.repository
      .serviceTable('organizations')
      .select('id,name,slug,account_type,owner_id,status,created_at,updated_at')
      .eq('id', orgId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const owner = data.owner_id ? await this.getUserIdentity(data.owner_id) : null

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      account_type: data.account_type,
      owner_id: data.owner_id,
      owner,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  private async getUserIdentity(userId: string) {
    const [authUser, profile] = await Promise.all([
      this.getAuthUser(userId),
      this.repository
        .serviceTable('user_profiles')
        .select('id, display_name')
        .eq('id', userId)
        .maybeSingle(),
    ])

    if (profile.error) throw profile.error

    return {
      id: userId,
      email: authUser?.email ?? null,
      name: (profile.data as any)?.display_name ?? null,
    }
  }

  private async getUserSubscription(userId: string) {
    const { data, error } = await this.repository
      .serviceTable('user_subscriptions')
      .select(
        'id,status,plan_id,current_period_start,current_period_end,subscription_plans(slug,name,base_credits,price_amount,interval)',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return this.normalizeSubscription(data)
  }

  private async getOrgSubscription(orgId: string) {
    const { data, error } = await this.repository
      .serviceTable('org_subscriptions')
      .select(
        'id,status,plan_id,current_period_start,current_period_end,subscription_plans(slug,name,base_credits,price_amount,interval)',
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return this.normalizeSubscription(data)
  }

  private normalizeSubscription(row: any) {
    if (!row) return null
    const plan = Array.isArray(row.subscription_plans)
      ? row.subscription_plans[0]
      : row.subscription_plans
    return {
      id: row.id,
      status: row.status,
      plan_id: row.plan_id,
      current_period_start: row.current_period_start,
      current_period_end: row.current_period_end,
      slug: plan?.slug ?? null,
      name: plan?.name ?? null,
      base_credits: Number(plan?.base_credits ?? 0),
      price_amount: Number(plan?.price_amount ?? 0),
      interval: plan?.interval ?? null,
    }
  }

  private async getPersonalCreditLedger(userId: string) {
    const [purchases, monthlyUsage] = await Promise.all([
      this.repository
        .serviceTable('credit_purchases')
        .select('id,credits_purchased,amount_paid,status,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      this.repository
        .serviceTable('monthly_credit_usage')
        .select(
          'id,month,base_allowance,base_credits_used,purchased_credits_used,total_credits_used,total_credits_purchased,rollover_credits',
        )
        .eq('user_id', userId)
        .order('month', { ascending: false })
        .limit(12),
    ])

    if (purchases.error) throw purchases.error
    if (monthlyUsage.error) throw monthlyUsage.error
    return { purchases: purchases.data ?? [], monthlyUsage: monthlyUsage.data ?? [] }
  }

  private async getOrgCreditLedger(orgId: string) {
    const [purchases, monthlyUsage] = await Promise.all([
      this.repository
        .serviceTable('org_credit_purchases')
        .select('id,credits_purchased,amount_paid,purchased_by,status,created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(20),
      this.repository
        .serviceTable('org_monthly_credit_usage')
        .select(
          'id,month,base_allowance,base_credits_used,purchased_credits_used,total_credits_used,total_credits_purchased,rollover_credits',
        )
        .eq('org_id', orgId)
        .order('month', { ascending: false })
        .limit(12),
    ])

    if (purchases.error) throw purchases.error
    if (monthlyUsage.error) throw monthlyUsage.error
    return { purchases: purchases.data ?? [], monthlyUsage: monthlyUsage.data ?? [] }
  }

  private async getOrgMembers(orgId: string) {
    const [members, limits] = await Promise.all([
      this.repository
        .serviceTable('org_members')
        .select('id,org_id,user_id,role,status,accepted_at,created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      this.repository
        .serviceTable('org_member_credit_limits')
        .select('member_id,period,credit_limit,credits_used,period_start,updated_at')
        .eq('org_id', orgId),
    ])

    if (members.error) throw members.error
    if (limits.error) throw limits.error

    const limitsByUser = new Map<string, any>()
    for (const limit of limits.data ?? []) limitsByUser.set(String(limit.member_id), limit)

    return (members.data ?? []).map((member: any) => ({
      ...member,
      joined_at: member.accepted_at ?? member.created_at ?? null,
      last_active_at: null,
      credit_limit: limitsByUser.get(String(member.id)) ?? null,
    }))
  }

  private buildOrgMemberUsageTotals(members: any[], usage: UsageRow[]) {
    const usageByUser = new Map<string, AdminAccountSummary>()

    for (const row of usage) {
      const userId = String(row.user_id ?? row.metadata_json?.requesting_user_id ?? '')
      if (!userId) continue
      const previous = usageByUser.get(userId)
      const next = summarizeUsage([row], 1)
      usageByUser.set(userId, previous ? mergeSummaries(previous, next) : next)
    }

    return members.map((member) => ({
      user_id: String(member.user_id),
      usage: usageByUser.get(String(member.user_id)) ?? summarizeUsage([], 1),
    }))
  }

  private async buildOrgMemberUsage(members: any[], usage: UsageRow[]) {
    const memberIds = members.map((member) => String(member.user_id)).filter(Boolean)
    const identities = await Promise.all(
      memberIds.map((memberId) => this.getUserIdentity(memberId)),
    )
    const identityById = new Map(identities.map((identity) => [identity.id, identity]))
    const usageByUser = new Map<string, AdminAccountSummary>()

    for (const row of usage) {
      const userId = String(row.user_id ?? row.metadata_json?.requesting_user_id ?? '')
      if (!userId) continue
      const previous = usageByUser.get(userId)
      const next = summarizeUsage([row], 1)
      usageByUser.set(userId, previous ? mergeSummaries(previous, next) : next)
    }

    return members.map((member) => {
      const userId = String(member.user_id)
      return {
        id: member.id,
        user_id: userId,
        role: member.role,
        status: member.status,
        joined_at: member.joined_at,
        last_active_at: member.last_active_at,
        identity: identityById.get(userId) ?? null,
        credit_limit: member.credit_limit,
        usage: usageByUser.get(userId) ?? summarizeUsage([], 1),
      }
    })
  }
}
