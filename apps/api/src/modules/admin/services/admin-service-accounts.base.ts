import { resolveMachineProfileRow } from '@vibey/api-shared'
import type { AdminOrgRow, AdminUserRow } from './admin-service.types'
import { AdminDashboardBase } from './admin-service-dashboard.base'

export abstract class AdminAccountsBase extends AdminDashboardBase {
  async getUsers() {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysIso = sevenDaysAgo.toISOString()
    const thirtyDaysIso = thirtyDaysAgo.toISOString()

    const [userProfiles, authUsersList] = await Promise.all([
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('user_profiles')
          .select('id, role, display_name, created_at, updated_at')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to),
      ),
      this.adminListAllAuthUsers(),
    ])

    const userIds = (userProfiles ?? []).map((p: { id: string }) => p.id)

    const [
      profilesWithMachine,
      subscriptionData,
      usageData,
      creditsRemainingByUser,
      { count: totalUsers },
      { count: newUsersLast7Days },
      { count: newUsersLast30Days },
      { count: activeUsersLast7Days },
    ] = await Promise.all([
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('profiles')
          .select(`id, ${this.machineColumns.machineId}, full_name`)
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('user_subscriptions')
          .select(
            'user_id, status, current_period_end, subscription_plans(name, slug, base_credits)',
          )
          .order('current_period_end', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllUsageForUserIds(
        userIds,
        'user_id, input_tokens, output_tokens, computed_cost, credits_charged',
      ),
      this.adminFetchPersonalCreditsRemainingByUser(userIds),
      this.repository.serviceTable('user_profiles').select('id', { count: 'exact', head: true }),
      this.repository
        .serviceTable('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysIso),
      this.repository
        .serviceTable('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysIso),
      this.repository
        .serviceTable('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', sevenDaysIso),
    ])

    const emailById = new Map<string, string | null>()
    for (const user of authUsersList) {
      emailById.set(user.id, user.email ?? null)
    }

    const machineById = new Map<string, string | null>()
    const fullNameById = new Map<string, string | null>()
    const profileMachineRows = (profilesWithMachine ?? []) as unknown as Array<
      Record<string, unknown>
    >
    for (const p of profileMachineRows) {
      const id = (p as any).id
      const machineProfile = resolveMachineProfileRow(p, this.machineColumns)
      machineById.set(id, machineProfile.machineId ?? null)
      const fn = (p as any).full_name
      if (fn && String(fn).trim()) fullNameById.set(id, String(fn).trim())
    }

    const usageByUserId = new Map<string, { tokens: number; credits: number; cost: number }>()
    for (const row of usageData ?? []) {
      const uid = (row as any).user_id
      if (!uid) continue
      const tokens =
        Number((row as any).input_tokens ?? 0) + Number((row as any).output_tokens ?? 0)
      const credits = Number((row as any).credits_charged ?? 0)
      const cost = Number((row as any).computed_cost ?? 0)
      const cur = usageByUserId.get(uid) ?? { tokens: 0, credits: 0, cost: 0 }
      usageByUserId.set(uid, {
        tokens: cur.tokens + tokens,
        credits: cur.credits + credits,
        cost: cur.cost + cost,
      })
    }

    const subByUserId = new Map<
      string,
      { plan: string | null; status: string | null; end: string | null }
    >()
    for (const sub of subscriptionData ?? []) {
      const uid = (sub as any).user_id
      if (subByUserId.has(uid)) continue
      const embeddedPlan = Array.isArray((sub as any)?.subscription_plans)
        ? (sub as any)?.subscription_plans?.[0]
        : (sub as any)?.subscription_plans
      const plan = embeddedPlan?.name ?? null
      const status = (sub as any).status ?? null
      const end = (sub as any).current_period_end ?? null
      subByUserId.set(uid, { plan, status, end })
    }

    const users: AdminUserRow[] = (userProfiles ?? []).map((profile: any) => {
      const usage = usageByUserId.get(profile.id) ?? {
        tokens: 0,
        credits: 0,
        cost: 0,
      }
      const sub = subByUserId.get(profile.id) ?? {
        plan: null,
        status: null,
        end: null,
      }
      return {
        id: profile.id,
        email: emailById.get(profile.id) ?? null,
        role: profile.role ?? null,
        display_name:
          (profile.display_name && String(profile.display_name).trim()) ||
          fullNameById.get(profile.id) ||
          null,
        created_at: profile.created_at ?? null,
        updated_at: profile.updated_at ?? null,
        fly_machine_id: machineById.get(profile.id) ?? null,
        total_tokens: usage.tokens,
        total_credits: usage.credits,
        credits_remaining: creditsRemainingByUser.get(profile.id) ?? 0,
        total_cost: usage.cost,
        subscription_plan: sub.plan,
        subscription_status: sub.status,
        subscription_end: sub.end,
      }
    })

    return {
      metrics: {
        totalUsers: totalUsers ?? 0,
        newUsersLast7Days: newUsersLast7Days ?? 0,
        newUsersLast30Days: newUsersLast30Days ?? 0,
        activeUsersLast7Days: activeUsersLast7Days ?? 0,
      },
      users,
    }
  }

  async getOrgs() {
    const [orgsList, authUsersList] = await Promise.all([
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('organizations')
          .select('id, name, slug, account_type, owner_id, status, created_at, updated_at')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to),
      ),
      this.adminListAllAuthUsers(),
    ])

    const orgIds = (orgsList ?? []).map((o: { id: string }) => o.id)
    const ownerIdSet = new Set<string>()
    for (const o of orgsList ?? []) {
      const oid = (o as { owner_id?: string }).owner_id
      if (oid) ownerIdSet.add(oid)
    }
    const ownerIds = [...ownerIdSet]

    const [orgSubscriptionData, usageData, creditsRemainingByOrg, ownerNameById] =
      await Promise.all([
        this.adminFetchAllByRange(async (from, to) =>
          this.repository
            .serviceTable('org_subscriptions')
            .select(
              'org_id, status, current_period_end, subscription_plans(name, slug, base_credits)',
            )
            .order('current_period_end', { ascending: false })
            .order('id', { ascending: true })
            .range(from, to),
        ),
        this.adminFetchAllUsageForOrgIds(
          orgIds,
          'org_id, input_tokens, output_tokens, computed_cost, credits_charged',
        ),
        this.adminFetchOrgCreditsRemainingByOrg(orgIds),
        this.adminFetchUserProfileDisplayNamesByIds(ownerIds),
      ])

    const emailById = new Map<string, string | null>()
    for (const user of authUsersList) {
      emailById.set(user.id, user.email ?? null)
    }

    const usageByOrgId = new Map<string, { tokens: number; credits: number; cost: number }>()
    for (const row of usageData ?? []) {
      const oid = (row as any).org_id
      if (!oid) continue
      const tokens =
        Number((row as any).input_tokens ?? 0) + Number((row as any).output_tokens ?? 0)
      const credits = Number((row as any).credits_charged ?? 0)
      const cost = Number((row as any).computed_cost ?? 0)
      const cur = usageByOrgId.get(oid) ?? { tokens: 0, credits: 0, cost: 0 }
      usageByOrgId.set(oid, {
        tokens: cur.tokens + tokens,
        credits: cur.credits + credits,
        cost: cur.cost + cost,
      })
    }

    const subByOrgId = new Map<
      string,
      { plan: string | null; status: string | null; end: string | null }
    >()
    for (const sub of orgSubscriptionData ?? []) {
      const oid = (sub as any).org_id
      if (subByOrgId.has(oid)) continue
      const embeddedPlan = Array.isArray((sub as any)?.subscription_plans)
        ? (sub as any)?.subscription_plans?.[0]
        : (sub as any)?.subscription_plans
      const plan = embeddedPlan?.name ?? null
      const status = (sub as any).status ?? null
      const end = (sub as any).current_period_end ?? null
      subByOrgId.set(oid, { plan, status, end })
    }

    const orgs: AdminOrgRow[] = (orgsList ?? []).map((org: any) => {
      const usage = usageByOrgId.get(org.id) ?? { tokens: 0, credits: 0, cost: 0 }
      const sub = subByOrgId.get(org.id) ?? { plan: null, status: null, end: null }
      const ownerId = org.owner_id ?? null
      return {
        id: org.id,
        name: org.name ?? null,
        slug: org.slug ?? null,
        account_type: org.account_type ?? null,
        status: org.status ?? null,
        owner_id: ownerId,
        owner_email: ownerId ? (emailById.get(ownerId) ?? null) : null,
        owner_display_name: ownerId ? (ownerNameById.get(ownerId) ?? null) : null,
        created_at: org.created_at ?? null,
        updated_at: org.updated_at ?? null,
        total_tokens: usage.tokens,
        total_credits: usage.credits,
        credits_remaining: creditsRemainingByOrg.get(org.id) ?? 0,
        total_cost: usage.cost,
        subscription_plan: sub.plan,
        subscription_status: sub.status,
        subscription_end: sub.end,
      }
    })

    return { orgs }
  }


}
