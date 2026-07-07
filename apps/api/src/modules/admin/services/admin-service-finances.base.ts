import { AdminAccountsBase } from './admin-service-accounts.base'

export abstract class AdminFinancesBase extends AdminAccountsBase {
  async getFinances(opts?: { days?: string; from?: string; to?: string; scope?: string }) {
    const scope = this.parseBillingScope(opts?.scope)
    const now = new Date()
    let rangeStart: Date
    let rangeEnd: Date = now
    let rangeDays: number

    if (opts?.from && opts?.to) {
      rangeStart = new Date(opts.from)
      rangeEnd = new Date(opts.to)
      rangeDays = Math.max(
        1,
        Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)),
      )
    } else {
      rangeDays = Math.min(Math.max(Number(opts?.days) || 30, 1), 365)
      rangeStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
    }

    const rangeStartIso = rangeStart.toISOString()
    const rangeEndIso = rangeEnd.toISOString()

    const [
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
          .serviceTable('ai_usage_events')
          .select(
            'user_id, org_id, feature, computed_cost, input_tokens, output_tokens, credits_charged, created_at',
          )
          .gte('created_at', rangeStartIso)
          .lte('created_at', rangeEndIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('user_subscriptions')
          .select(
            `user_id, status, stripe_subscription_id, created_at, subscription_plans!inner(name, price_amount, interval)`,
          )
          .eq('status', 'active')
          .gte('created_at', rangeStartIso)
          .lte('created_at', rangeEndIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('org_subscriptions')
          .select(
            `org_id, status, stripe_subscription_id, created_at, subscription_plans!inner(name, price_amount, interval)`,
          )
          .eq('status', 'active')
          .gte('created_at', rangeStartIso)
          .lte('created_at', rangeEndIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('user_addons')
          .select('user_id, addon_slug, status, created_at, stripe_subscription_item_id')
          .eq('status', 'active')
          .gte('created_at', rangeStartIso)
          .lte('created_at', rangeEndIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('org_addons')
          .select('org_id, addon_slug, status, created_at, stripe_subscription_item_id')
          .eq('status', 'active')
          .gte('created_at', rangeStartIso)
          .lte('created_at', rangeEndIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('credit_purchases')
          .select('user_id, amount_paid, credits_purchased, stripe_payment_intent_id, created_at')
          .eq('status', 'completed')
          .gt('amount_paid', 0)
          .gte('created_at', rangeStartIso)
          .lte('created_at', rangeEndIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('org_credit_purchases')
          .select('org_id, amount_paid, credits_purchased, stripe_payment_intent_id, created_at')
          .eq('status', 'completed')
          .gt('amount_paid', 0)
          .gte('created_at', rangeStartIso)
          .lte('created_at', rangeEndIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
    ])

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

    const mergeCreditRowsFin: any[] = []
    if (includePersonal) mergeCreditRowsFin.push(...(creditPurchaseData ?? []))
    if (includeOrg) mergeCreditRowsFin.push(...(orgCreditPurchaseData ?? []))

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
    let creditPackCount = 0
    let totalCreditsSold = 0
    for (const row of mergeCreditRowsFin) {
      const intentId = (row as any).stripe_payment_intent_id
      if (!intentId) continue
      if (uniquePaidIntents.has(intentId)) continue
      uniquePaidIntents.add(intentId)
      creditPackRevenue += Number((row as any).amount_paid ?? 0)
      totalCreditsSold += Number((row as any).credits_purchased ?? 0)
      creditPackCount++
    }

    const totalRevenue = mrr + addonMrr + creditPackRevenue

    const allUsage = this.filterUsageByBillingScope(usageData ?? [], scope)
    const totalCost30d = allUsage.reduce(
      (sum: number, r: any) => sum + Number(r.computed_cost ?? 0),
      0,
    )
    const totalRequests30d = allUsage.length
    const totalTokens30d = allUsage.reduce(
      (sum: number, r: any) => sum + Number(r.input_tokens ?? 0) + Number(r.output_tokens ?? 0),
      0,
    )
    const totalCredits30d = allUsage.reduce(
      (sum: number, r: any) => sum + Number(r.credits_charged ?? 0),
      0,
    )
    const avgDailyCost = totalCost30d / rangeDays

    const netProfit = totalRevenue - totalCost30d
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    const roi = totalCost30d > 0 ? totalRevenue / totalCost30d : 0
    const payingAccounts = mergedSubs.length
    const costPerCustomer = payingAccounts > 0 ? totalCost30d / payingAccounts : 0
    const revenuePerCustomer = payingAccounts > 0 ? totalRevenue / payingAccounts : 0
    const profitPerCustomer = revenuePerCustomer - costPerCustomer

    const costByFeature = new Map<string, { cost: number; requests: number; credits: number }>()
    for (const r of allUsage) {
      const feat = String((r as any).feature ?? 'unknown')
      const cur = costByFeature.get(feat) ?? { cost: 0, requests: 0, credits: 0 }
      cur.cost += Number((r as any).computed_cost ?? 0)
      cur.requests += 1
      cur.credits += Number((r as any).credits_charged ?? 0)
      costByFeature.set(feat, cur)
    }
    const featureBreakdown = Array.from(costByFeature.entries())
      .map(([feature, d]) => ({
        feature,
        totalCost: Math.round(d.cost * 100) / 100,
        requests: d.requests,
        credits: d.credits,
        avgPerRequest: d.requests > 0 ? Math.round((d.cost / d.requests) * 10000) / 10000 : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)

    const costTrendBuckets: Record<string, { cost: number; requests: number }> = {}
    const revenueTrendBuckets: Record<string, number> = {}
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      costTrendBuckets[d] = { cost: 0, requests: 0 }
      revenueTrendBuckets[d] = 0
    }
    for (const r of allUsage) {
      const date = String((r as any).created_at ?? '').slice(0, 10)
      if (costTrendBuckets[date]) {
        costTrendBuckets[date].cost += Number((r as any).computed_cost ?? 0)
        costTrendBuckets[date].requests += 1
      }
    }
    for (const sub of mergedSubs) {
      const date = String((sub as any).created_at ?? '').slice(0, 10)
      const amountCents = Number((sub as any)?.subscription_plans?.price_amount ?? 0)
      if (revenueTrendBuckets[date] !== undefined) revenueTrendBuckets[date] += amountCents / 100
    }
    for (const addon of mergedAddons) {
      const date = String((addon as any).created_at ?? '').slice(0, 10)
      if (revenueTrendBuckets[date] !== undefined) revenueTrendBuckets[date] += 10
    }
    const seenIntents = new Set<string>()
    for (const row of mergeCreditRowsFin) {
      const intentId = (row as any).stripe_payment_intent_id
      if (!intentId || seenIntents.has(intentId)) continue
      seenIntents.add(intentId)
      const date = String((row as any).created_at ?? '').slice(0, 10)
      if (revenueTrendBuckets[date] !== undefined) {
        revenueTrendBuckets[date] += Number((row as any).amount_paid ?? 0)
      }
    }

    const costTrend30d = Object.entries(costTrendBuckets)
      .map(([date, d]) => ({
        date,
        totalCost: Math.round(d.cost * 100) / 100,
        totalRequests: d.requests,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const revenueTrend30d = Object.entries(revenueTrendBuckets)
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const planBreakdown = new Map<string, { count: number; mrr: number }>()
    for (const sub of mergedSubs) {
      const planName = String((sub as any)?.subscription_plans?.name ?? 'Unknown')
      const amountCents = Number((sub as any)?.subscription_plans?.price_amount ?? 0)
      const interval = String((sub as any)?.subscription_plans?.interval ?? 'month')
      const monthlyDollars = (interval === 'year' ? amountCents / 12 : amountCents) / 100
      const cur = planBreakdown.get(planName) ?? { count: 0, mrr: 0 }
      cur.count += 1
      cur.mrr += monthlyDollars
      planBreakdown.set(planName, cur)
    }
    const planBreakdownArr = Array.from(planBreakdown.entries())
      .map(([plan, d]) => ({ plan, count: d.count, mrr: Math.round(d.mrr * 100) / 100 }))
      .sort((a, b) => b.mrr - a.mrr)

    return {
      scope,
      rangeDays,
      rangeFrom: rangeStart.toISOString(),
      rangeTo: rangeEnd.toISOString(),
      summary: {
        mrr,
        arr: mrr * 12,
        addonMrr,
        addonCount: mergedAddons.length,
        creditPackRevenue,
        creditPackCount,
        totalCreditsSold,
        totalRevenue,
        totalCost30d,
        totalRequests30d,
        totalTokens30d,
        totalCredits30d,
        avgDailyCost,
        activePaidUsers: payingAccounts,
      },
      profitability: {
        netProfit,
        profitMargin,
        roi,
        costPerCustomer,
        revenuePerCustomer,
        profitPerCustomer,
      },
      featureBreakdown,
      planBreakdown: planBreakdownArr,
      costTrend30d,
      revenueTrend30d,
    }
  }


}
