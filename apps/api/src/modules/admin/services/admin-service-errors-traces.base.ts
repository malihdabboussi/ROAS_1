import { BadRequestException, NotFoundException } from '@nestjs/common'
import { AdminFinancesBase } from './admin-service-finances.base'

export abstract class AdminErrorsTracesBase extends AdminFinancesBase {
  async getOperations() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent24h } = await this.repository
      .serviceTable('app_errors')
      .select('app, severity')
      .gte('created_at', oneDayAgo)

    const rows = recent24h ?? []
    const byApp: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    for (const r of rows) {
      const app = (r as { app: string }).app ?? 'unknown'
      const severity = (r as { severity: string }).severity ?? 'error'
      byApp[app] = (byApp[app] ?? 0) + 1
      bySeverity[severity] = (bySeverity[severity] ?? 0) + 1
    }

    return {
      totalErrors24h: rows.length,
      errorsByApp: Object.entries(byApp).map(([app, count]) => ({ app, count })),
      errorsBySeverity: Object.entries(bySeverity).map(([severity, count]) => ({
        severity,
        count,
      })),
    }
  }

  async getErrors(opts?: { userName?: string }) {
    const nameSearch = opts?.userName?.trim() ?? ''
    const take = 200
    const columns =
      'id, created_at, app, environment, severity, feature, error_code, message, context, user_id, resolved, resolved_at, category, agent_key, trace_id, message_id, request_id, run_id, conversation_id, source_file, source_line, source_column, function_name, runtime_file, runtime_line, runtime_column, commit_sha, release_id, build_id, source_resolved, code_context'

    let rows: Record<string, unknown>[]

    if (nameSearch.length > 0) {
      const nameUserIds = await this.findUserIdsByDisplayNameSearch(nameSearch)
      if (nameUserIds.length === 0) {
        return { errors: [] }
      }
      const chunkSize = 80
      const acc: Record<string, unknown>[] = []
      for (let i = 0; i < nameUserIds.length; i += chunkSize) {
        const chunk = nameUserIds.slice(i, i + chunkSize)
        const { data, error } = await this.repository
          .serviceTable('app_errors')
          .select(columns)
          .in('user_id', chunk)
          .order('created_at', { ascending: false })
          .limit(take)
        if (error) {
          return { errors: [] }
        }
        acc.push(...((data as Record<string, unknown>[]) ?? []))
      }
      acc.sort(
        (a, b) =>
          new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
      )
      rows = acc.slice(0, take)
    } else {
      const { data, error } = await this.repository
        .serviceTable('app_errors')
        .select(columns)
        .order('created_at', { ascending: false })
        .limit(take)

      if (error) {
        return { errors: [] }
      }
      rows = (data as Record<string, unknown>[]) ?? []
    }

    const uidList = [
      ...new Set(
        rows
          .map((r) => r.user_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ]
    const nameMap = await this.buildTraceUserDisplayNameMap(uidList)
    const enriched = rows.map((r) => {
      const uid = typeof r.user_id === 'string' ? r.user_id : null
      return {
        ...r,
        user_display_name: uid ? (nameMap.get(uid) ?? null) : null,
      }
    })
    return { errors: await this.enrichRowsWithRouteEvents(enriched) }
  }

  protected static readonly ADMIN_TRACE_USER_ID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  protected static readonly ADMIN_TRACE_NAME_SEARCH_LIMIT = 2000

  /** List/admin metrics — excludes large LLM payload columns */
  protected static readonly ADMIN_TRACE_LIST_COLUMNS =
    'id, user_id, org_id, conversation_id, message_id, run_id, request_id, campaign_id, session_key, user_message, channel, agent_key, gateway_agent_id, history_length, tool_steps, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_tokens, started_at, completed_at, duration_ms, status, terminal_status, user_visible_outcome, recovery_status, recovery_events, observability, error, model, cost_usd, created_at'

  protected static readonly ADMIN_ROUTE_EVENT_COLUMNS =
    'id, created_at, request_id, trace_id, message_id, run_id, conversation_id, surface, service, route, method, event_type, stage, status, status_code, duration_ms, span_id, parent_span_id, error_code, error_class, workflow_class, effect_state, retry_policy, source_file, source_line, source_column, function_name, runtime_file, runtime_line, runtime_column, commit_sha, release_id, build_id, source_resolved, code_context, observability'

  protected async findUserIdsByDisplayNameSearch(search: string): Promise<string[]> {
    const pattern = `%${search}%`
    const lim = AdminErrorsTracesBase.ADMIN_TRACE_NAME_SEARCH_LIMIT
    const [upRes, profRes] = await Promise.all([
      this.repository
        .serviceTable('user_profiles')
        .select('id')
        .ilike('display_name', pattern)
        .limit(lim),
      this.repository.serviceTable('profiles').select('id').ilike('full_name', pattern).limit(lim),
    ])
    if (upRes.error) {
      throw new BadRequestException(`Failed to search users: ${upRes.error.message}`)
    }
    if (profRes.error) {
      throw new BadRequestException(`Failed to search users: ${profRes.error.message}`)
    }
    const set = new Set<string>()
    for (const r of upRes.data ?? []) {
      set.add((r as { id: string }).id)
    }
    for (const r of profRes.data ?? []) {
      set.add((r as { id: string }).id)
    }
    return [...set]
  }

  protected async buildTraceUserDisplayNameMap(
    userIds: string[],
  ): Promise<Map<string, string | null>> {
    const map = new Map<string, string | null>()
    if (userIds.length === 0) return map
    const chunkSize = 100
    const upDisplay = new Map<string, string | null>()
    const profFull = new Map<string, string | null>()
    const unique = [...new Set(userIds)]
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize)
      const [upRes, profRes] = await Promise.all([
        this.repository.serviceTable('user_profiles').select('id, display_name').in('id', chunk),
        this.repository.serviceTable('profiles').select('id, full_name').in('id', chunk),
      ])
      if (upRes.error) {
        throw new BadRequestException(`Failed to load user names: ${upRes.error.message}`)
      }
      if (profRes.error) {
        throw new BadRequestException(`Failed to load user names: ${profRes.error.message}`)
      }
      for (const r of upRes.data ?? []) {
        const row = r as { id: string; display_name: string | null }
        upDisplay.set(row.id, row.display_name ?? null)
      }
      for (const r of profRes.data ?? []) {
        const row = r as { id: string; full_name: string | null }
        profFull.set(row.id, row.full_name ?? null)
      }
    }
    for (const id of unique) {
      const dn = upDisplay.get(id)
      const fn = profFull.get(id)
      const resolved = (dn && String(dn).trim()) || (fn && String(fn).trim()) || null
      map.set(id, resolved)
    }
    return map
  }

  async getAgentTraces(opts?: {
    status?: string
    limit?: string
    userId?: string
    channel?: string
    userName?: string
  }) {
    const raw = Number(opts?.limit)
    const take = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 100) : 50
    const status = opts?.status?.trim()
    const allowed = new Set(['streaming', 'completed', 'failed'])
    const userIdRaw = opts?.userId?.trim() ?? ''
    const userId =
      userIdRaw.length > 0 && AdminErrorsTracesBase.ADMIN_TRACE_USER_ID_RE.test(userIdRaw) ? userIdRaw : null
    const channel = opts?.channel?.trim() || null
    const nameSearch = opts?.userName?.trim() ?? ''

    let rows: Record<string, unknown>[]

    if (nameSearch.length > 0) {
      let nameUserIds = await this.findUserIdsByDisplayNameSearch(nameSearch)
      if (userId) {
        nameUserIds = nameUserIds.filter((id) => id === userId)
      }
      if (nameUserIds.length === 0) {
        return []
      }
      const chunkSize = 80
      const acc: Record<string, unknown>[] = []
      for (let i = 0; i < nameUserIds.length; i += chunkSize) {
        const chunk = nameUserIds.slice(i, i + chunkSize)
        let q = this.repository
          .serviceTable('vb_agent_traces')
          .select(AdminErrorsTracesBase.ADMIN_TRACE_LIST_COLUMNS)
          .in('user_id', chunk)
          .order('created_at', { ascending: false })
          .limit(take)
        if (status && allowed.has(status)) {
          q = q.eq('status', status)
        }
        if (channel) {
          q = q.eq('channel', channel)
        }
        const { data, error } = await q
        if (error) throw new BadRequestException(`Failed to load traces: ${error.message}`)
        acc.push(...((data as Record<string, unknown>[]) ?? []))
      }
      acc.sort(
        (a, b) =>
          new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
      )
      rows = acc.slice(0, take)
    } else {
      let query = this.repository
        .serviceTable('vb_agent_traces')
        .select(AdminErrorsTracesBase.ADMIN_TRACE_LIST_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(take)

      if (status && allowed.has(status)) {
        query = query.eq('status', status)
      }
      if (userId) {
        query = query.eq('user_id', userId)
      }
      if (channel) {
        query = query.eq('channel', channel)
      }

      const { data, error } = await query
      if (error) throw new BadRequestException(`Failed to load traces: ${error.message}`)
      rows = (data as Record<string, unknown>[]) ?? []
    }

    return this.enrichRowsWithRouteEvents(await this.enrichTracesWithUserDisplayNames(rows))
  }

  async getAgentTraceById(id: string) {
    const traceId = id?.trim() ?? ''
    if (!traceId || !AdminErrorsTracesBase.ADMIN_TRACE_USER_ID_RE.test(traceId)) {
      throw new BadRequestException('Invalid trace id')
    }

    const { data, error } = await this.repository
      .serviceTable('vb_agent_traces')
      .select('*')
      .eq('id', traceId)
      .maybeSingle()

    if (error) {
      throw new BadRequestException(`Failed to load trace: ${error.message}`)
    }
    if (!data) {
      throw new NotFoundException('Trace not found')
    }

    const rows = await this.enrichRowsWithRouteEvents(
      await this.enrichTracesWithUserDisplayNames([data as Record<string, unknown>]),
    )
    return rows[0]
  }

  protected async enrichTracesWithUserDisplayNames(
    rows: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]> {
    const uidList = [...new Set(rows.map((r) => String(r.user_id)))].filter(Boolean)
    const nameMap = await this.buildTraceUserDisplayNameMap(uidList)
    return rows.map((r) => ({
      ...r,
      user_display_name: nameMap.get(String(r.user_id)) ?? null,
    }))
  }

  async resolveError(id: string) {
    const { error } = await this.repository
      .serviceTable('app_errors')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new BadRequestException(`Failed to resolve error: ${error.message}`)
    }
    return { ok: true }
  }

  async getRequestTraceByRequestId(requestId: string) {
    const normalized = requestId?.trim() ?? ''
    if (!normalized || normalized.length > 256) {
      throw new BadRequestException('Invalid request id')
    }

    const [eventsResult, errorsResult, tracesResult] = await Promise.all([
      this.repository
        .serviceTable('request_trace_events')
        .select(AdminErrorsTracesBase.ADMIN_ROUTE_EVENT_COLUMNS)
        .eq('request_id', normalized)
        .order('created_at', { ascending: true })
        .limit(500),
      this.repository
        .serviceTable('app_errors')
        .select(
          'id, created_at, app, severity, feature, error_code, message, user_id, trace_id, message_id, request_id, run_id, conversation_id, source_file, source_line, source_column, function_name, commit_sha, release_id, build_id, source_resolved',
        )
        .eq('request_id', normalized)
        .order('created_at', { ascending: false })
        .limit(100),
      this.repository
        .serviceTable('vb_agent_traces')
        .select(AdminErrorsTracesBase.ADMIN_TRACE_LIST_COLUMNS)
        .eq('request_id', normalized)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    if (eventsResult.error) {
      throw new BadRequestException(`Failed to load route events: ${eventsResult.error.message}`)
    }

    return {
      request_id: normalized,
      route_events: (eventsResult.data as Record<string, unknown>[]) ?? [],
      errors: (errorsResult.data as Record<string, unknown>[]) ?? [],
      traces: await this.enrichTracesWithUserDisplayNames(
        (tracesResult.data as Record<string, unknown>[]) ?? [],
      ),
    }
  }

  private async enrichRowsWithRouteEvents(
    rows: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]> {
    const requestIds = [
      ...new Set(
        rows
          .map((r) => r.request_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ]
    if (requestIds.length === 0) return rows.map((row) => ({ ...row, route_events: [] }))

    const { data, error } = await this.repository
      .serviceTable('request_trace_events')
      .select(AdminErrorsTracesBase.ADMIN_ROUTE_EVENT_COLUMNS)
      .in('request_id', requestIds)
      .order('created_at', { ascending: true })
      .limit(1000)
    if (error) {
      return rows.map((row) => ({ ...row, route_events: [] }))
    }

    const byRequestId = new Map<string, Record<string, unknown>[]>()
    for (const event of (data as Record<string, unknown>[]) ?? []) {
      const requestId = typeof event.request_id === 'string' ? event.request_id : ''
      if (!requestId) continue
      const bucket = byRequestId.get(requestId) ?? []
      bucket.push(event)
      byRequestId.set(requestId, bucket)
    }

    return rows.map((row) => {
      const requestId = typeof row.request_id === 'string' ? row.request_id : ''
      return { ...row, route_events: requestId ? (byRequestId.get(requestId) ?? []) : [] }
    })
  }

}
