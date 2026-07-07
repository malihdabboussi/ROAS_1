import { AdminServiceBase } from './admin-service.base'

export abstract class AdminDashboardBase extends AdminServiceBase {
  async getDashboard(scopeRaw?: string) {
    const scope = this.parseBillingScope(scopeRaw)
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const oneDayIso = oneDayAgo.toISOString()
    const sevenDaysIso = sevenDaysAgo.toISOString()
    const thirtyDaysIso = thirtyDaysAgo.toISOString()

    const [
      { count: totalUsers, error: totalUsersError },
      { count: newUsersLast24h, error: new24Error },
      { count: newUsersLast7Days, error: new7Error },
      { count: activeUsersLast7Days, error: activeError },
      { count: totalOrganizations, error: totalOrgErr },
      { count: newOrgsLast24h, error: newOrg24Err },
      { count: newOrgsLast7Days, error: newOrg7Err },
      { count: totalOrgMembers, error: totalOrgMemErr },
      { count: newOrgMembersLast7Days, error: newOrgMem7Err },
    ] = await Promise.all([
      this.repository.serviceTable('user_profiles').select('id', { count: 'exact', head: true }),
      this.repository
        .serviceTable('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneDayIso),
      this.repository
        .serviceTable('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysIso),
      this.repository
        .serviceTable('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', sevenDaysIso),
      this.repository.serviceTable('organizations').select('id', { count: 'exact', head: true }),
      this.repository
        .serviceTable('organizations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneDayIso),
      this.repository
        .serviceTable('organizations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysIso),
      this.repository.serviceTable('org_members').select('id', { count: 'exact', head: true }),
      this.repository
        .serviceTable('org_members')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysIso),
    ])

    const [
      userSignups7d,
      userSignups30d,
      orgSignups7d,
      orgSignups30d,
      usageData,
      subscriptionData,
      orgSubscriptionData,
      addonData,
      orgAddonData,
      creditPurchaseData,
      orgCreditPurchaseData,
    ] = await Promise.all([
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('user_profiles')
          .select('created_at')
          .gte('created_at', sevenDaysIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('user_profiles')
          .select('created_at')
          .gte('created_at', thirtyDaysIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('organizations')
          .select('created_at')
          .gte('created_at', sevenDaysIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('organizations')
          .select('created_at')
          .gte('created_at', thirtyDaysIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('ai_usage_events')
          .select('user_id, org_id, computed_cost, input_tokens, output_tokens, created_at')
          .gte('created_at', thirtyDaysIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('user_subscriptions')
          .select(
            `
          user_id,
          status,
          created_at,
          stripe_subscription_id,
          subscription_plans!inner(
            price_amount,
            interval
          )
        `,
          )
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('org_subscriptions')
          .select(
            `
          org_id,
          status,
          created_at,
          stripe_subscription_id,
          subscription_plans!inner(
            price_amount,
            interval
          )
        `,
          )
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('user_addons')
          .select('user_id, addon_slug, status, created_at, stripe_subscription_item_id')
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('org_addons')
          .select('org_id, addon_slug, status, created_at, stripe_subscription_item_id')
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('credit_purchases')
          .select('user_id, amount_paid, stripe_payment_intent_id, created_at')
          .eq('status', 'completed')
          .gt('amount_paid', 0)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('org_credit_purchases')
          .select('org_id, amount_paid, stripe_payment_intent_id, created_at')
          .eq('status', 'completed')
          .gt('amount_paid', 0)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
    ])

    if (totalUsersError) throw totalUsersError
    if (new24Error) throw new24Error
    if (new7Error) throw new7Error
    if (activeError) throw activeError
    if (totalOrgErr) throw totalOrgErr
    if (newOrg24Err) throw newOrg24Err
    if (newOrg7Err) throw newOrg7Err
    if (totalOrgMemErr) throw totalOrgMemErr
    if (newOrgMem7Err) throw newOrgMem7Err

    const filteredSubsPersonal = (subscriptionData ?? []).filter(
      (sub: any) => sub.stripe_subscription_id,
    )
    const filteredSubsOrg = (orgSubscriptionData ?? []).filter(
      (sub: any) => sub.stripe_subscription_id,
    )
    const customerAddonsPersonal = (addonData ?? []).filter(
      (a: any) => a.stripe_subscription_item_id,
    )
    const customerAddonsOrg = (orgAddonData ?? []).filter((a: any) => a.stripe_subscription_item_id)

    const includePersonal = scope === 'personal' || scope === 'all'
    const includeOrg = scope === 'organization' || scope === 'all'

    const mergedSubs: any[] = []
    if (includePersonal) mergedSubs.push(...filteredSubsPersonal)
    if (includeOrg) mergedSubs.push(...filteredSubsOrg)

    const mergedAddons: any[] = []
    if (includePersonal) mergedAddons.push(...customerAddonsPersonal)
    if (includeOrg) mergedAddons.push(...customerAddonsOrg)

    const mrr = mergedSubs.reduce((sum, sub) => sum + this.subscriptionMrrDollars(sub), 0)
    const addonMrr = mergedAddons.length * 10

    const uniquePaidIntents = new Set<string>()
    let creditPackRevenue = 0
    const mergeCreditRows: any[] = []
    if (includePersonal) mergeCreditRows.push(...(creditPurchaseData ?? []))
    if (includeOrg) mergeCreditRows.push(...(orgCreditPurchaseData ?? []))
    for (const row of mergeCreditRows) {
      const intentId = (row as any).stripe_payment_intent_id
      if (!intentId) continue
      if (uniquePaidIntents.has(intentId)) continue
      uniquePaidIntents.add(intentId)
      creditPackRevenue += Number((row as any).amount_paid ?? 0)
    }

    const totalRevenue = mrr + addonMrr + creditPackRevenue

    const allUsage = this.filterUsageByBillingScope(usageData ?? [], scope)
    const totalCost30d = allUsage.reduce(
      (sum: number, row: any) => sum + Number(row.computed_cost ?? 0),
      0,
    )
    const totalRequests30d = allUsage.length
    const totalTokens30d = allUsage.reduce(
      (sum: number, row: any) =>
        sum + Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0),
      0,
    )

    const userCostByUserId = new Map<string, number>()
    const orgCostByOrgId = new Map<string, number>()
    for (const row of usageData ?? []) {
      const cost = Number((row as any).computed_cost ?? 0)
      const oid = (row as any).org_id
      const uid = (row as any).user_id
      if (oid) orgCostByOrgId.set(String(oid), (orgCostByOrgId.get(String(oid)) ?? 0) + cost)
      else if (uid)
        userCostByUserId.set(String(uid), (userCostByUserId.get(String(uid)) ?? 0) + cost)
    }
    let usersOver20 = 0
    if (scope === 'personal') {
      usersOver20 = [...userCostByUserId.values()].filter((c) => c >= 20).length
    } else if (scope === 'organization') {
      usersOver20 = [...orgCostByOrgId.values()].filter((c) => c >= 20).length
    } else {
      usersOver20 =
        [...userCostByUserId.values()].filter((c) => c >= 20).length +
        [...orgCostByOrgId.values()].filter((c) => c >= 20).length
    }

    const buildDailyTrend = (
      records: { created_at: string }[],
      days: number,
      countKey: string,
    ): { date: string; [k: string]: string | number }[] => {
      const buckets: Record<string, number> = {}
      for (let i = 0; i < days; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        buckets[d.toISOString().slice(0, 10)] = 0
      }
      for (const r of records) {
        const date = (r.created_at ?? '').slice(0, 10)
        if (buckets[date] !== undefined) buckets[date]++
      }
      return Object.entries(buckets)
        .map(([date, count]) => ({ date, [countKey]: count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    const buildCostTrend = (
      records: any[],
      days: number,
    ): { date: string; totalCost: number }[] => {
      const buckets: Record<string, number> = {}
      for (let i = 0; i < days; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        buckets[d.toISOString().slice(0, 10)] = 0
      }
      for (const r of records) {
        const date = (r.created_at ?? '').slice(0, 10)
        const cost = Number(r.computed_cost ?? 0)
        if (buckets[date] !== undefined) buckets[date] += cost
      }
      return Object.entries(buckets)
        .map(([date, totalCost]) => ({ date, totalCost }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    const buildRevenueTrend = (days: number): { date: string; revenue: number }[] => {
      const buckets: Record<string, number> = {}
      for (let i = 0; i < days; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        buckets[d.toISOString().slice(0, 10)] = 0
      }

      for (const sub of mergedSubs) {
        const date = String((sub as any).created_at ?? '').slice(0, 10)
        const amountCents = Number((sub as any)?.subscription_plans?.price_amount ?? 0)
        if (buckets[date] !== undefined) buckets[date] += amountCents / 100
      }

      for (const addon of mergedAddons) {
        const date = String((addon as any).created_at ?? '').slice(0, 10)
        if (buckets[date] !== undefined) buckets[date] += 10
      }

      const seenTrendIntents = new Set<string>()
      for (const row of mergeCreditRows) {
        const intentId = (row as any).stripe_payment_intent_id
        if (!intentId || seenTrendIntents.has(intentId)) continue
        seenTrendIntents.add(intentId)
        const date = String((row as any).created_at ?? '').slice(0, 10)
        if (buckets[date] !== undefined) {
          buckets[date] += Number((row as any).amount_paid ?? 0)
        }
      }

      return Object.entries(buckets)
        .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    const userTrend7d =
      scope === 'organization'
        ? buildDailyTrend([], 7, 'count')
        : buildDailyTrend((userSignups7d ?? []) as { created_at: string }[], 7, 'count')
    const userTrend30d =
      scope === 'organization'
        ? buildDailyTrend([], 30, 'count')
        : buildDailyTrend((userSignups30d ?? []) as { created_at: string }[], 30, 'count')
    const orgTrend7d =
      scope === 'personal'
        ? buildDailyTrend([], 7, 'count')
        : buildDailyTrend((orgSignups7d ?? []) as { created_at: string }[], 7, 'count')
    const orgTrend30d =
      scope === 'personal'
        ? buildDailyTrend([], 30, 'count')
        : buildDailyTrend((orgSignups30d ?? []) as { created_at: string }[], 30, 'count')
    const revenueTrend7d = buildRevenueTrend(7)
    const revenueTrend30d = buildRevenueTrend(30)
    const costTrend7d = buildCostTrend(
      allUsage.filter((r: any) => new Date(r.created_at) >= sevenDaysAgo),
      7,
    )
    const costTrend30d = buildCostTrend(allUsage, 30)
    const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [errorRows30d, openErrorCount, criticalErrorCount] = await Promise.all([
      this.repository
        .serviceTable('app_errors')
        .select('created_at')
        .gte('created_at', thirtyDaysAgoIso)
        .then((r) => r.data ?? []),
      this.repository
        .serviceTable('app_errors')
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false)
        .then((r) => r.count ?? 0),
      this.repository
        .serviceTable('app_errors')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .eq('resolved', false)
        .then((r) => r.count ?? 0),
    ])
    const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const errorRows7d = errorRows30d.filter(
      (r: { created_at: string }) => r.created_at >= sevenDaysAgoIso,
    )
    const oneDayAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const recentErrorCount = errorRows30d.filter(
      (r: { created_at: string }) => r.created_at >= oneDayAgoIso,
    ).length
    const errorTrend7d = buildDailyTrend(errorRows7d, 7, 'count')
    const errorTrend30d = buildDailyTrend(errorRows30d, 30, 'count')

    return {
      scope,
      users: {
        totalUsers: scope === 'organization' ? 0 : (totalUsers ?? 0),
        newUsersLast24h: scope === 'organization' ? 0 : (newUsersLast24h ?? 0),
        newUsersLast7Days: scope === 'organization' ? 0 : (newUsersLast7Days ?? 0),
        activeUsersLast7Days: scope === 'organization' ? 0 : (activeUsersLast7Days ?? 0),
        userTrend7d,
        userTrend30d,
      },
      organizations: {
        totalOrganizations: scope === 'personal' ? 0 : (totalOrganizations ?? 0),
        totalOrgMembers: scope === 'personal' ? 0 : (totalOrgMembers ?? 0),
        newOrganizationsLast24h: scope === 'personal' ? 0 : (newOrgsLast24h ?? 0),
        newOrganizationsLast7Days: scope === 'personal' ? 0 : (newOrgsLast7Days ?? 0),
        newOrgMembersLast7Days: scope === 'personal' ? 0 : (newOrgMembersLast7Days ?? 0),
        orgTrend7d,
        orgTrend30d,
      },
      revenue: {
        paidUsers: mergedSubs.length,
        mrr,
        arr: mrr * 12,
        addonMrr,
        addonCount: mergedAddons.length,
        creditPackRevenue,
        totalRevenue,
        usersOver20,
        revenueTrend7d,
        revenueTrend30d,
      },
      costs: {
        totalCost30d,
        totalRequests30d,
        totalTokens30d,
        costTrend7d,
        costTrend30d,
      },
      errors: {
        totalErrorGroups: errorRows30d.length,
        openErrors: openErrorCount,
        criticalErrors: criticalErrorCount,
        recentErrors: recentErrorCount,
        errorTrend7d,
        errorTrend30d,
      },
    }
  }


}
