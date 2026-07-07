import { AdminInvitesBase } from './admin-service-invites.base'

export abstract class AdminBillingHealthBase extends AdminInvitesBase {
  async getBillingHealth(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: unresolvedCount },
      recentFailures,
      costSourceRows,
      modelsMissingPricing,
      reconciliationRows,
    ] = await Promise.all([
      this.repository
        .serviceTable('billing_health_log')
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false),
      this.repository
        .serviceTable('billing_health_log')
        .select('id, feature, action, user_id, model_name, reason, error_message, created_at')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50)
        .then((r) => r.data ?? []),
      Promise.resolve(this.repository.rpc('billing_cost_source_breakdown', { since_date: since }))
        .then((r) => r.data ?? [])
        .catch(() => [] as Array<Record<string, unknown>>),
      Promise.resolve(this.repository.rpc('billing_models_missing_pricing'))
        .then((r) => r.data ?? [])
        .catch(() => [] as Array<Record<string, unknown>>),
      this.repository
        .serviceTable('billing_health_checks')
        .select('*')
        .order('check_date', { ascending: false })
        .limit(days)
        .then((r) => r.data ?? []),
    ])

    let costSourceBreakdown = costSourceRows
    if (!Array.isArray(costSourceBreakdown) || costSourceBreakdown.length === 0) {
      const { data: fallbackRows } = await this.repository
        .serviceTable('ai_usage_events')
        .select('cost_source, computed_cost')
        .gte('created_at', since)
      const buckets = new Map<string, { total_cost: number; event_count: number }>()
      for (const r of fallbackRows ?? []) {
        const src = String((r as Record<string, unknown>).cost_source ?? 'unknown')
        const cur = buckets.get(src) ?? { total_cost: 0, event_count: 0 }
        cur.total_cost += Number((r as Record<string, unknown>).computed_cost ?? 0)
        cur.event_count += 1
        buckets.set(src, cur)
      }
      costSourceBreakdown = Array.from(buckets.entries()).map(([cost_source, d]) => ({
        cost_source,
        total_cost: Math.round(d.total_cost * 100) / 100,
        event_count: d.event_count,
      }))
    }

    return {
      unresolvedCount: unresolvedCount ?? 0,
      recentFailures,
      costSourceBreakdown,
      modelsMissingPricing,
      reconciliation: reconciliationRows,
    }
  }

  async resolveBillingHealthItem(id: string) {
    const { error } = await this.repository
      .serviceTable('billing_health_log')
      .update({ resolved: true })
      .eq('id', id)
    if (error) throw error
    return { success: true as const }
  }

  private isOpenRouterActualCostRow(row: Record<string, unknown>): boolean {
    const source = String(row.cost_source ?? '')
    if (source === 'openrouter_api' || source === 'openrouter_calc' || source === 'mixed') {
      return true
    }
    if (source !== 'provider_direct') {
      return false
    }

    const computedCost = Number(row.computed_cost ?? 0)
    const modelName = String(row.model_name ?? '')
    const metadata =
      row.metadata_json && typeof row.metadata_json === 'object'
        ? (row.metadata_json as Record<string, unknown>)
        : {}
    const providerCost =
      typeof metadata.provider_cost === 'number' && Number.isFinite(metadata.provider_cost)
        ? metadata.provider_cost
        : null
    if (computedCost === 0 && !modelName.includes(':free')) {
      return false
    }

    return (
      metadata.provider_billing === 'openrouter' ||
      providerCost !== null ||
      Array.isArray(metadata.provider_generation_ids) ||
      Array.isArray(metadata.generation_ids) ||
      Array.isArray(row.generation_ids)
    )
  }

  async runBillingReconciliation(): Promise<{
    success: boolean
    check_date: string
    delta_percent: number | null
    status: string
  }> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return { success: false, check_date: '', delta_percent: null, status: 'no_api_key' }
    }

    const now = new Date()
    const checkDate = now.toISOString().slice(0, 10)
    const start = `${checkDate}T00:00:00.000Z`
    const end = new Date(new Date(start).getTime() + 24 * 60 * 60 * 1000).toISOString()

    let openrouterCost = 0
    let openrouterRequests = 0
    let openrouterAllTimeCost: number | null = null
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (res.ok) {
        const json = (await res.json()) as {
          data?: { usage?: number; usage_daily?: number; rate_limit?: { requests?: number } }
        }
        openrouterCost = json.data?.usage_daily ?? 0
        openrouterAllTimeCost = json.data?.usage ?? null
        openrouterRequests = json.data?.rate_limit?.requests ?? 0
      }
    } catch {
      /* OpenRouter API unavailable */
    }

    const dbRows = await this.adminFetchAllByRange<Record<string, unknown>>((from, to) =>
      this.repository
        .serviceTable('ai_usage_events')
        .select('computed_cost, cost_source, generation_ids, metadata_json, created_at, model_name')
        .gte('created_at', start)
        .lt('created_at', end)
        .in('cost_source', ['provider_direct', 'openrouter_api', 'openrouter_calc', 'mixed'])
        .order('created_at', { ascending: true })
        .range(from, to),
    )

    const openrouterRows = dbRows.filter((row) => this.isOpenRouterActualCostRow(row))
    const dbCost = openrouterRows.reduce(
      (sum: number, r: Record<string, unknown>) => sum + Number(r.computed_cost ?? 0),
      0,
    )
    const dbCount = openrouterRows.length

    const deltaPercent =
      openrouterCost > 0
        ? Math.round(((dbCost - openrouterCost) / openrouterCost) * 10000) / 100
        : null

    const absDelta = Math.abs(deltaPercent ?? 0)
    const status =
      deltaPercent === null
        ? 'no_openrouter_data'
        : absDelta < 5
          ? 'ok'
          : absDelta < 15
            ? 'warning'
            : 'critical'

    await this.repository.serviceTable('billing_health_checks').upsert(
      {
        check_date: checkDate,
        openrouter_reported_cost: openrouterCost || null,
        db_computed_cost: dbCost,
        delta_percent: deltaPercent,
        openrouter_request_count: openrouterRequests || null,
        db_event_count: dbCount,
        status,
        metadata: {
          ran_at: new Date().toISOString(),
          openrouter_field: 'usage_daily',
          openrouter_usage_all_time: openrouterAllTimeCost,
          utc_window: { start, end },
          db_row_source: 'actual_openrouter_cost_rows',
          candidate_db_event_count: dbRows.length,
        },
      },
      { onConflict: 'check_date' },
    )

    if (status === 'warning' || status === 'critical') {
      console.warn(
        `[billing-health] reconciliation_delta check_date=${checkDate} db=${dbCost.toFixed(2)} openrouter=${openrouterCost.toFixed(2)} delta=${deltaPercent?.toFixed(1)}% status=${status}`,
      )
    }

    return { success: true, check_date: checkDate, delta_percent: deltaPercent, status }
  }

  /**
   * One-shot cleanup for agent brains whose agents no longer exist in agents_registry.
   *
   * Finds every active ns_brains row with agent_id not NULL whose (owner, org, agent_key)
   * does not match any agents_registry row. In dry-run mode, only returns the list.
   * Otherwise calls StripeService.cancelAgentBrainAddonInternal for each, which cancels
   * any Stripe subscription item, marks the addon canceling, and sets the brain to
   * pending_deletion with a 14-day grace window.
   */
  async purgeOrphanAgentBrains(opts?: { dryRun?: boolean; limit?: number }) {
    const dryRun = opts?.dryRun !== false
    const limit = Math.max(1, Math.min(500, opts?.limit ?? 200))

    const { data: brains, error } = await this.repository
      .serviceTable('ns_brains')
      .select('id, owner_id, org_id, agent_id, name, status, created_at')
      .not('agent_id', 'is', null)
      .eq('status', 'active')
      .limit(limit)
    if (error) throw new Error(`Failed to load brains: ${error.message}`)

    type OrphanRow = {
      brain_id: string
      owner_id: string
      org_id: string | null
      agent_id: string
      name: string
      created_at: string
      cancellation?: { canceled: boolean; deletion_at: string | null }
      error?: string
    }

    const orphans: OrphanRow[] = []

    for (const brain of brains ?? []) {
      const agentKey = String(brain.agent_id)
      let agentQ = this.repository
        .serviceTable('agents_registry')
        .select('id')
        .eq('agent_key', agentKey)
      if (brain.org_id) {
        agentQ = agentQ.eq('org_id', brain.org_id).is('user_id', null)
      } else {
        agentQ = agentQ.eq('user_id', brain.owner_id).is('org_id', null)
      }
      const { data: match, error: matchErr } = (await agentQ.maybeSingle()) as {
        data: { id: string } | null
        error: { message: string } | null
      }
      if (matchErr) {
        orphans.push({
          brain_id: String(brain.id),
          owner_id: String(brain.owner_id),
          org_id: (brain.org_id as string | null) ?? null,
          agent_id: agentKey,
          name: String(brain.name ?? ''),
          created_at: String(brain.created_at ?? ''),
          error: `agents_registry lookup failed: ${matchErr.message}`,
        })
        continue
      }
      if (match) continue

      orphans.push({
        brain_id: String(brain.id),
        owner_id: String(brain.owner_id),
        org_id: (brain.org_id as string | null) ?? null,
        agent_id: agentKey,
        name: String(brain.name ?? ''),
        created_at: String(brain.created_at ?? ''),
      })
    }

    if (!dryRun) {
      for (const orphan of orphans) {
        try {
          const cancellation = await this.stripeService.cancelAgentBrainAddonInternal(
            orphan.owner_id,
            orphan.agent_id,
            orphan.org_id,
          )
          orphan.cancellation = {
            canceled: cancellation.canceled,
            deletion_at: cancellation.deletion_at,
          }
        } catch (err) {
          orphan.error = (err as Error).message
        }
      }
    }

    return {
      dry_run: dryRun,
      checked: brains?.length ?? 0,
      orphan_count: orphans.length,
      orphans,
    }
  }
}
