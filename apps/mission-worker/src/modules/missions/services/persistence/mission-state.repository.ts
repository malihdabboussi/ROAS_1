import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseService } from '../../../../lib/services/database.service'
import { priorityToRank, type AgentKey, type MissionStatus } from '../../types'
import { AgentSignalService } from '../agent-signal.service'

@Injectable()
export class MissionStateRepository {
  private readonly logger = new Logger(MissionStateRepository.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly agentSignalService: AgentSignalService,
  ) {}

  private isDirectDbTransportError(error: unknown): boolean {
    const message = String((error as Error)?.message || '')
    return /self-signed certificate|password authentication failed|ECONNREFUSED|connection timeout|Connection terminated/i.test(
      message,
    )
  }

  async getMission(
    supabase: SupabaseClient,
    missionId: string,
    userId?: string,
    orgId?: string | null,
  ) {
    let query = supabase.from('missions').select('*').eq('id', missionId)
    if (userId) query = query.eq('user_id', userId)
    if (orgId !== undefined) query = query[orgId ? 'eq' : 'is']('org_id', orgId ?? null)
    const { data, error } = await query.single()
    if (error) throw new Error(`Failed mission lookup: ${error.message}`)
    return data
  }

  async getPlan(
    supabase: SupabaseClient,
    missionId: string,
    userId?: string,
    orgId?: string | null,
  ) {
    let query = supabase.from('missions_plans').select('*').eq('mission_id', missionId)
    if (userId) query = query.eq('user_id', userId)
    if (orgId !== undefined) query = query[orgId ? 'eq' : 'is']('org_id', orgId ?? null)
    const { data } = await query.maybeSingle()
    return data
  }

  async resolveManagerKey(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key')
      .in('level', ['c_level', 'manager'])
      .order('created_at', { ascending: true })
      .limit(1)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data } = await query.maybeSingle()
    return data?.agent_key ?? 'vibey'
  }

  async getRecentUserComments(
    supabase: SupabaseClient,
    missionId: string,
    userId?: string,
    orgId?: string | null,
  ): Promise<string[]> {
    let query = supabase
      .from('missions_logs')
      .select('payload')
      .eq('mission_id', missionId)
      .eq('event_type', 'user.comment')
      .order('created_at', { ascending: true })
      .limit(20)
    if (userId) query = query.eq('user_id', userId)
    if (orgId !== undefined) query = query[orgId ? 'eq' : 'is']('org_id', orgId ?? null)
    const { data, error } = await query
    if (error || !data) return []
    return data
      .map((row) => {
        const payload = row.payload as Record<string, unknown> | null
        return typeof payload?.message === 'string' ? payload.message : null
      })
      .filter((msg): msg is string => !!msg)
  }

  async missionHasSubtasks(
    supabase: SupabaseClient,
    missionId: string,
    userId?: string,
    orgId?: string | null,
  ): Promise<boolean> {
    let query = supabase.from('mission_subtasks').select('id').eq('mission_id', missionId).limit(1)
    if (userId) query = query.eq('user_id', userId)
    if (orgId !== undefined) query = query[orgId ? 'eq' : 'is']('org_id', orgId ?? null)
    const { data, error } = await query
    if (error) throw new Error(`Failed to check mission subtasks: ${error.message}`)
    return !!data && data.length > 0
  }

  async getSubtaskDependencyOutputs(
    supabase: SupabaseClient,
    dependsOn: string[],
  ): Promise<Array<{ title: string; output: string }>> {
    if (!dependsOn.length) return []
    const { data } = await supabase
      .from('mission_subtasks')
      .select('title, output')
      .in('id', dependsOn)
      .eq('status', 'done')
    return (data || []).map((d) => ({
      title: d.title as string,
      output: typeof d.output === 'object' ? JSON.stringify(d.output) : String(d.output || ''),
    }))
  }

  async updateMissionState(
    supabase: SupabaseClient,
    missionId: string,
    updates: {
      status: MissionStatus
      error?: string | null
      output?: Record<string, unknown>
      current_agent_key?: string | null
      retry_count?: number
      progress_notes?: string | null
    },
  ) {
    const { data: missionMeta, error: missionMetaError } = await supabase
      .from('missions')
      .select('campaign_id, user_id, org_id')
      .eq('id', missionId)
      .maybeSingle()
    if (missionMetaError)
      throw new Error(`Failed mission lookup for state sync: ${missionMetaError.message}`)

    const payload: Record<string, unknown> = {
      status: updates.status,
      updated_at: new Date().toISOString(),
    }
    if (updates.error !== undefined) payload.error = updates.error
    if (updates.output !== undefined) payload.output = updates.output
    if (updates.current_agent_key !== undefined)
      payload.current_agent_key = updates.current_agent_key
    if (updates.retry_count !== undefined) payload.retry_count = updates.retry_count
    if (updates.progress_notes !== undefined) payload.progress_notes = updates.progress_notes
    if (updates.status === 'in_progress') payload.started_at = new Date().toISOString()
    if (updates.status === 'done' || updates.status === 'error' || updates.status === 'failed') {
      payload.completed_at = new Date().toISOString()
    }

    const missionUserId = missionMeta?.user_id ? String(missionMeta.user_id) : ''
    if (!missionUserId) throw new Error(`Failed mission lookup for state sync: missing user_id`)
    const missionOrgId =
      missionMeta && Object.prototype.hasOwnProperty.call(missionMeta, 'org_id')
        ? ((missionMeta.org_id as string | null | undefined) ?? null)
        : null
    const { error } = await supabase
      .from('missions')
      .update(payload)
      .eq('id', missionId)
      .eq('user_id', missionUserId)
      [missionOrgId ? 'eq' : 'is']('org_id', missionOrgId)
    if (error) throw new Error(`Failed mission state update: ${error.message}`)

    const campaignId = missionMeta?.campaign_id ? String(missionMeta.campaign_id) : ''
    if (campaignId && missionUserId) {
      await this.syncCampaignActiveWorkAndEmitIdleSignal(
        campaignId,
        missionUserId,
        missionId,
        missionOrgId,
      ).catch((syncError) => {
        this.logger.error(
          `Failed campaign active-work sync for mission ${missionId}: ${(syncError as Error).message}`,
        )
      })
    }
  }

  private async syncCampaignActiveWorkAndEmitIdleSignal(
    campaignId: string,
    userId: string,
    missionId: string,
    orgId?: string | null,
  ): Promise<void> {
    if (this.databaseService.hasPgPool()) {
      const { rows: campaignRows } = await this.databaseService.pgQuery<{
        has_active_work: boolean
      }>(
        `
          SELECT has_active_work
          FROM campaigns
          WHERE id = $1::uuid
            AND user_id = $2::uuid
            AND org_id IS NOT DISTINCT FROM $3::uuid
          LIMIT 1
        `,
        [campaignId, userId, orgId ?? null],
      )
      const campaignRow = campaignRows[0]
      if (!campaignRow) return

      const { rows: activeRows } = await this.databaseService.pgQuery<{ has_active_work: boolean }>(
        `
          SELECT EXISTS(
            SELECT 1
            FROM missions
            WHERE campaign_id = $1::uuid
              AND user_id = $2::uuid
              AND org_id IS NOT DISTINCT FROM $3::uuid
              AND status = 'in_progress'
          ) AS has_active_work
        `,
        [campaignId, userId, orgId ?? null],
      )
      const hasActiveWork = Boolean(activeRows[0]?.has_active_work)
      const hadActiveWork = Boolean(campaignRow.has_active_work)

      if (hadActiveWork === hasActiveWork) return

      await this.databaseService.pgQuery(
        `
          UPDATE campaigns
          SET has_active_work = $2::boolean
          WHERE id = $1::uuid
            AND user_id = $3::uuid
            AND org_id IS NOT DISTINCT FROM $4::uuid
        `,
        [campaignId, hasActiveWork, userId, orgId ?? null],
      )

      if (hadActiveWork && !hasActiveWork) {
        await this.agentSignalService.emitSignal(
          userId,
          'all_campaign_work_idle',
          2.0,
          { source: 'campaign_active_work_transition', mission_id: missionId },
          campaignId,
          orgId,
        )
      }
      return
    }

    const supabase = this.databaseService.getClient()
    const { data: campaignRow, error: campaignError } = await supabase
      .from('campaigns')
      .select('has_active_work')
      .eq('id', campaignId)
      .eq('user_id', userId)
      [orgId ? 'eq' : 'is']('org_id', orgId ?? null)
      .maybeSingle()
    if (campaignError)
      throw new Error(`Failed campaign lookup for active-work sync: ${campaignError.message}`)
    if (!campaignRow) return

    const { data: inProgressRows, error: inProgressError } = await supabase
      .from('missions')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      [orgId ? 'eq' : 'is']('org_id', orgId ?? null)
      .eq('status', 'in_progress')
      .limit(1)
    if (inProgressError)
      throw new Error(`Failed mission lookup for active-work sync: ${inProgressError.message}`)

    const hasActiveWork = Array.isArray(inProgressRows) && inProgressRows.length > 0
    const hadActiveWork = Boolean(campaignRow.has_active_work)
    if (hadActiveWork === hasActiveWork) return

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ has_active_work: hasActiveWork })
      .eq('id', campaignId)
      .eq('user_id', userId)
      [orgId ? 'eq' : 'is']('org_id', orgId ?? null)
    if (updateError) throw new Error(`Failed campaign active-work update: ${updateError.message}`)

    if (hadActiveWork && !hasActiveWork) {
      await this.agentSignalService.emitSignal(
        userId,
        'all_campaign_work_idle',
        2.0,
        { source: 'campaign_active_work_transition', mission_id: missionId },
        campaignId,
        orgId,
      )
    }
  }

  async updateAgentStatus(
    supabase: SupabaseClient,
    userId: string,
    agentKey: AgentKey | string,
    status: 'online' | 'idle' | 'working' | 'offline',
    orgId?: string | null,
  ) {
    let query = supabase
      .from('agents_registry')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { error } = await query
    if (error) this.logger.error(`Failed to update agent status: ${error.message}`)
  }

  async insertLog(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    eventType: string,
    fromStatus: string,
    toStatus: string,
    payload: Record<string, unknown>,
    agentKey?: string,
  ) {
    const { error } = await supabase.from('missions_logs').insert({
      mission_id: mission.id,
      user_id: mission.user_id,
      org_id: mission.org_id ?? null,
      event_type: eventType,
      from_status: fromStatus,
      to_status: toStatus,
      agent_key: agentKey || mission.current_agent_key || mission.assigned_agent_key || null,
      correlation_id: mission.correlation_id,
      payload,
    })
    if (error) this.logger.error(`Failed mission log insert: ${error.message}`)
  }

  async enqueueMissionOutboxEvent(
    supabase: SupabaseClient,
    input: {
      missionId: string
      userId: string
      orgId?: string | null
      eventType: string
      dedupeKey: string
      payload?: Record<string, unknown>
      requeueExistingDedupeKey?: boolean
      priorityRank?: number
      nextAttemptAt?: string
    },
  ) {
    const rank = input.priorityRank ?? 3
    const nextAttemptIso = input.nextAttemptAt || new Date().toISOString()
    try {
      if (!this.databaseService.hasPgPool()) {
        if (input.requeueExistingDedupeKey) {
          const { error } = await supabase.from('mission_outbox').upsert(
            {
              mission_id: input.missionId,
              user_id: input.userId,
              org_id: input.orgId ?? null,
              event_type: input.eventType,
              dedupe_key: input.dedupeKey,
              payload: input.payload || {},
              priority_rank: rank,
              status: 'pending',
              next_attempt_at: nextAttemptIso,
              locked_at: null,
              error: null,
              attempts: 0,
              processed_at: null,
            },
            { onConflict: 'dedupe_key' },
          )
          if (error) throw new Error(error.message)
          return
        }
        const { error } = await supabase.from('mission_outbox').insert({
          mission_id: input.missionId,
          user_id: input.userId,
          org_id: input.orgId ?? null,
          event_type: input.eventType,
          dedupe_key: input.dedupeKey,
          payload: input.payload || {},
          priority_rank: rank,
          status: 'pending',
          next_attempt_at: nextAttemptIso,
        })
        if (error) throw new Error(error.message)
        return
      }

      const conflictSql = input.requeueExistingDedupeKey
        ? `
          ON CONFLICT (dedupe_key) DO UPDATE SET
            mission_id = EXCLUDED.mission_id,
            user_id = EXCLUDED.user_id,
            org_id = EXCLUDED.org_id,
            event_type = EXCLUDED.event_type,
            payload = EXCLUDED.payload,
            priority_rank = EXCLUDED.priority_rank,
            status = 'pending',
            next_attempt_at = EXCLUDED.next_attempt_at,
            locked_at = NULL,
            error = NULL,
            attempts = 0,
            processed_at = NULL
        `
        : `ON CONFLICT (dedupe_key) DO NOTHING`

      await this.databaseService.pgQuery(
        `
          INSERT INTO mission_outbox (
            mission_id,
            user_id,
            org_id,
            event_type,
            dedupe_key,
            payload,
            priority_rank,
            status,
            next_attempt_at
          )
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::jsonb, $7::smallint, 'pending', $8::timestamptz)
          ${conflictSql}
        `,
        [
          input.missionId,
          input.userId,
          input.orgId ?? null,
          input.eventType,
          input.dedupeKey,
          JSON.stringify(input.payload || {}),
          rank,
          nextAttemptIso,
        ],
      )
    } catch (error) {
      if (this.isDirectDbTransportError(error)) {
        try {
          const fallbackWrite = input.requeueExistingDedupeKey
            ? supabase.from('mission_outbox').upsert(
                {
                  mission_id: input.missionId,
                  user_id: input.userId,
                  org_id: input.orgId ?? null,
                  event_type: input.eventType,
                  dedupe_key: input.dedupeKey,
                  payload: input.payload || {},
                  priority_rank: rank,
                  status: 'pending',
                  next_attempt_at: nextAttemptIso,
                  locked_at: null,
                  error: null,
                  attempts: 0,
                  processed_at: null,
                },
                { onConflict: 'dedupe_key' },
              )
            : supabase.from('mission_outbox').insert({
                mission_id: input.missionId,
                user_id: input.userId,
                org_id: input.orgId ?? null,
                event_type: input.eventType,
                dedupe_key: input.dedupeKey,
                payload: input.payload || {},
                priority_rank: rank,
                status: 'pending',
                next_attempt_at: nextAttemptIso,
              })
          const { error: fallbackError } = await fallbackWrite
          if (fallbackError) throw new Error(fallbackError.message)
          this.logger.warn(
            `Direct PG unavailable; wrote mission outbox via Supabase for ${input.eventType}`,
          )
          return
        } catch (fallback) {
          this.logger.error(
            `Failed Supabase fallback for mission outbox event ${input.eventType}: ${(fallback as Error).message}`,
          )
          return
        }
      }
      this.logger.error(
        `Failed to write mission outbox event ${input.eventType}: ${(error as Error).message}`,
      )
    }
  }

  async enqueueReadySubtaskEvents(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId?: string | null,
    metadata?: Record<string, unknown>,
  ) {
    const { data: missionRow } = await supabase
      .from('missions')
      .select('priority')
      .eq('id', missionId)
      .maybeSingle()
    const rank = priorityToRank(missionRow?.priority)

    let subtasks: Array<{
      id: string
      status: string
      depends_on: string[] | null
      scheduled_at: string | null
    }> = []
    if (!this.databaseService.hasPgPool()) {
      const { data, error } = await supabase
        .from('mission_subtasks')
        .select('id, status, depends_on, scheduled_at')
        .eq('mission_id', missionId)
        .order('sort_order', { ascending: true })
      if (error) {
        this.logger.error(`Failed to load subtasks for outbox enqueue: ${error.message}`)
        return
      }
      subtasks = (data || []) as Array<{
        id: string
        status: string
        depends_on: string[] | null
        scheduled_at: string | null
      }>
    } else {
      try {
        const result = await this.databaseService.pgQuery<{
          id: string
          status: string
          depends_on: string[] | null
          scheduled_at: string | null
        }>(
          `
            SELECT id, status, depends_on, scheduled_at
            FROM mission_subtasks
            WHERE mission_id = $1::uuid
            ORDER BY sort_order ASC
          `,
          [missionId],
        )
        subtasks = result.rows
      } catch (error) {
        if (!this.isDirectDbTransportError(error)) {
          this.logger.error(
            `Failed to load subtasks for outbox enqueue: ${(error as Error).message}`,
          )
          return
        }
        const { data, error: fallbackError } = await supabase
          .from('mission_subtasks')
          .select('id, status, depends_on, scheduled_at')
          .eq('mission_id', missionId)
          .order('sort_order', { ascending: true })
        if (fallbackError) {
          this.logger.error(`Failed to load subtasks for outbox enqueue: ${fallbackError.message}`)
          return
        }
        subtasks = (data || []) as Array<{
          id: string
          status: string
          depends_on: string[] | null
          scheduled_at: string | null
        }>
        this.logger.warn(
          `Direct PG unavailable; loaded subtasks via Supabase for mission ${missionId}`,
        )
      }
    }

    if (!subtasks || subtasks.length === 0) return

    const activeSubtasks = subtasks.filter((st) => String(st.status) !== 'cancelled')
    const statusById = new Map(subtasks.map((st) => [String(st.id), String(st.status)]))
    for (const subtask of activeSubtasks) {
      if (String(subtask.status) !== 'pending') continue
      const dependsOn = Array.isArray(subtask.depends_on) ? (subtask.depends_on as string[]) : []
      const depSatisfied = (depId: string) => {
        const st = statusById.get(String(depId))
        return st === 'done' || st === 'cancelled'
      }
      const depsReady = dependsOn.every(depSatisfied)
      if (!depsReady) continue

      const subtaskId = String(subtask.id)
      const scheduledAt = subtask.scheduled_at
      const nextAttemptAt =
        scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? scheduledAt : undefined

      await this.enqueueMissionOutboxEvent(supabase, {
        missionId,
        userId,
        orgId,
        eventType: 'mission.subtask.execute.requested',
        dedupeKey: `mission:${missionId}:subtask:${subtaskId}:execute:ready`,
        priorityRank: rank,
        nextAttemptAt,
        payload: {
          phase: 'execute',
          subtask_id: subtaskId,
          ...(metadata || {}),
        },
        requeueExistingDedupeKey: true,
      })
    }
  }

  private computeMissionAggregateFromSubtasks(
    subs: Array<{ id: string; status: string; depends_on: string[] | null }>,
  ): {
    nextStatus: MissionStatus
    enqueueReview: boolean
    progressNotes?: string
  } {
    const active = subs.filter((s) => String(s.status) !== 'cancelled')
    // Product policy: all subtasks cancelled → mission `blocked` (must match API MissionInternalService)
    if (active.length === 0) {
      return {
        nextStatus: 'blocked',
        enqueueReview: false,
        progressNotes: 'No remaining subtasks — mission has no active work',
      }
    }
    const statusById = new Map(active.map((s) => [String(s.id), String(s.status)]))
    const hasRunnablePending = active.some((s) => {
      if (String(s.status) !== 'pending') return false
      const deps = Array.isArray(s.depends_on) ? s.depends_on.map(String) : []
      return deps.every((d) => {
        const st = statusById.get(d)
        return st === 'done' || st === 'cancelled'
      })
    })

    if (active.some((s) => String(s.status) === 'in_progress')) {
      return { nextStatus: 'in_progress', enqueueReview: false }
    }
    if (active.every((s) => String(s.status) === 'done')) {
      return {
        nextStatus: 'review',
        enqueueReview: true,
        progressNotes: 'All subtasks completed — ready for review',
      }
    }
    // An active human gate outranks later pending work that cannot start until it is approved.
    // Mirrors API MissionInternalService.
    const hasAwaitingHuman = active.some((s) => String(s.status) === 'awaiting_human')
    if (hasAwaitingHuman) {
      return {
        nextStatus: 'awaiting_human',
        enqueueReview: false,
        progressNotes: 'Waiting for your approval — review is required before work continues',
      }
    }
    if (hasRunnablePending) {
      return { nextStatus: 'todo', enqueueReview: false }
    }
    const onlyStuck = active.every((s) => ['blocked', 'revision'].includes(String(s.status)))
    if (onlyStuck) {
      return {
        nextStatus: 'blocked',
        enqueueReview: false,
        progressNotes: 'All active subtasks are blocked — triage or user input required',
      }
    }
    return { nextStatus: 'todo', enqueueReview: false }
  }

  async recomputeMissionStatus(supabase: SupabaseClient, missionId: string): Promise<void> {
    await this.databaseService.withMissionAdvisoryLock(missionId, async () => {
      const mission = await this.getMission(supabase, missionId)
      const { data: subs, error } = await supabase
        .from('mission_subtasks')
        .select('id,status,depends_on')
        .eq('mission_id', missionId)
      if (error) throw new Error(`recomputeMissionStatus: ${error.message}`)
      const rows = (subs || []) as Array<{
        id: string
        status: string
        depends_on: string[] | null
      }>
      if (rows.length === 0) return

      const aggregate = this.computeMissionAggregateFromSubtasks(rows)
      const prevStatus = String(mission.status)

      if (aggregate.nextStatus !== prevStatus) {
        await this.updateMissionState(supabase, missionId, {
          status: aggregate.nextStatus,
          ...(aggregate.nextStatus === 'review'
            ? {
                current_agent_key: null,
                ...(aggregate.progressNotes ? { progress_notes: aggregate.progressNotes } : {}),
              }
            : {}),
          ...(aggregate.nextStatus === 'blocked'
            ? {
                current_agent_key: null,
                error: null,
                ...(aggregate.progressNotes ? { progress_notes: aggregate.progressNotes } : {}),
              }
            : {}),
          ...(aggregate.nextStatus === 'todo' ? { current_agent_key: null } : {}),
          ...(aggregate.nextStatus === 'awaiting_human'
            ? {
                current_agent_key: null,
                ...(aggregate.progressNotes ? { progress_notes: aggregate.progressNotes } : {}),
              }
            : {}),
        })
      }

      if (aggregate.enqueueReview && aggregate.nextStatus === 'review' && prevStatus !== 'review') {
        await this.enqueueMissionOutboxEvent(supabase, {
          missionId,
          userId: String(mission.user_id),
          orgId: mission.org_id ?? null,
          eventType: 'mission.review.requested',
          dedupeKey: `mission:${missionId}:review:recompute`,
          requeueExistingDedupeKey: true,
          priorityRank: priorityToRank(mission.priority),
          payload: {
            phase: 'review',
            requested_by: 'recompute_mission_status',
          },
        })
      }
    })
  }
}
