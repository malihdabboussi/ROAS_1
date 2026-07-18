import { randomUUID } from 'crypto'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ManagerCancelSubtaskDto, ManagerEditSubtaskDto, ManagerRetrySubtaskDto } from '../dto'
import { priorityToRank } from '../types/missions.types'
import { MissionInternalManagerScopeBase } from './mission-internal-manager-scope.base'

export abstract class MissionInternalManagerSubtasksBase extends MissionInternalManagerScopeBase {
  protected collectSubtasksToCancelWithDependents(
    allSubs: Array<{ id: string; depends_on: string[] | null }>,
    rootId: string,
  ): Set<string> {
    const toCancel = new Set<string>([rootId])
    let changed = true
    while (changed) {
      changed = false
      for (const st of allSubs) {
        if (toCancel.has(String(st.id))) continue
        const deps = Array.isArray(st.depends_on) ? st.depends_on.map(String) : []
        if (deps.some((d) => toCancel.has(d))) {
          toCancel.add(String(st.id))
          changed = true
        }
      }
    }
    return toCancel
  }

  protected computeMissionAggregateFromSubtasks(
    subs: Array<{ id: string; status: string; depends_on: string[] | null }>,
  ): {
    nextStatus: 'in_progress' | 'todo' | 'review' | 'blocked' | 'awaiting_human'
    enqueueReview: boolean
    progressNotes?: string
  } {
    const active = subs.filter((s) => String(s.status) !== 'cancelled')
    // Product policy: all subtasks cancelled → mission `blocked` (must match worker MissionStateRepository)
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
    // An active human gate is the mission's next action even when later pending rows remain
    // dependency-blocked behind it. Distinct from `blocked` — SLA-clocked, not triage-required.
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

  /** Mission rollup without acquiring advisory lock — caller must hold lock or accept races. */
  protected async applyMissionAggregateUnlocked(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    const mission = await this.missionsRepository.findMissionById(
      supabase,
      missionId,
      userId,
      orgId,
    )
    const rows = await this.missionInternalRepository.listSubtaskStatusesForAggregate(
      supabase,
      missionId,
    )
    const aggregate = this.computeMissionAggregateFromSubtasks(rows)

    const statusPatch: {
      status: typeof aggregate.nextStatus
      current_agent_key?: null
      progress_notes?: string
      error?: null
    } = { status: aggregate.nextStatus }
    if (aggregate.nextStatus === 'review') {
      statusPatch.current_agent_key = null
      if (aggregate.progressNotes) statusPatch.progress_notes = aggregate.progressNotes
    }
    if (aggregate.nextStatus === 'blocked') {
      statusPatch.current_agent_key = null
      statusPatch.error = null
      if (aggregate.progressNotes) statusPatch.progress_notes = aggregate.progressNotes
    }
    if (aggregate.nextStatus === 'todo') {
      statusPatch.current_agent_key = null
    }
    if (aggregate.nextStatus === 'awaiting_human') {
      statusPatch.current_agent_key = null
      if (aggregate.progressNotes) statusPatch.progress_notes = aggregate.progressNotes
    }

    if (aggregate.nextStatus !== mission.status) {
      await this.missionsRepository.updateMissionStatus(
        supabase,
        missionId,
        userId,
        orgId,
        statusPatch,
      )
    }

    if (
      aggregate.enqueueReview &&
      aggregate.nextStatus === 'review' &&
      mission.status !== 'review'
    ) {
      await this.missionOutboxService.enqueueOutboxEvent(supabase, {
        missionId,
        userId,
        orgId: mission.org_id ?? null,
        eventType: 'mission.review.requested',
        dedupeKey: `mission:${missionId}:review:aggregate`,
        priorityRank: priorityToRank(mission.priority),
        payload: {
          phase: 'review',
          requested_by: 'subtask_aggregate_complete',
        },
      })
    }
  }

  protected async applyMissionAggregateAfterSubtaskChange(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    await this.postgresDirect.withMissionAdvisoryLock(missionId, () =>
      this.applyMissionAggregateUnlocked(supabase, missionId, userId, orgId),
    )
  }

  async managerCancelSubtask(dto: ManagerCancelSubtaskDto) {
    const supabase = this.getServiceRoleClient()
    if (dto.idempotency_key) {
      const existing = await this.missionInternalRepository.findMissionLogByIdempotencyKey(
        supabase,
        {
          missionId: dto.mission_id,
          eventType: 'mission.subtask.cancelled',
          idempotencyKey: dto.idempotency_key,
        },
      )
      if (existing) return { ok: true, idempotent: true }
    }
    return this.postgresDirect.withMissionAdvisoryLock(dto.mission_id, async () => {
      const mission = await this.missionsRepository.findMissionById(
        supabase,
        dto.mission_id,
        dto.user_id,
        dto.org_id,
      )
      const sub = await this.missionInternalRepository.findManagerSubtask(
        supabase,
        {
          subtaskId: dto.subtask_id,
          missionId: dto.mission_id,
          userId: dto.user_id,
        },
        'id, mission_id, user_id, status, title',
      )
      if (!sub) throw new NotFoundException('Subtask not found')
      if (String(sub.status) === 'cancelled') {
        await this.applyMissionAggregateUnlocked(supabase, dto.mission_id, dto.user_id, dto.org_id)
        return { ok: true, noop: true }
      }

      const subRows = await this.missionInternalRepository.listSubtasksForCancellation(
        supabase,
        dto.mission_id,
      )
      const toCancel = this.collectSubtasksToCancelWithDependents(subRows, dto.subtask_id)
      const cancelIds = [...toCancel]

      await this.missionInternalRepository.cancelSubtasksByIds(
        supabase,
        cancelIds,
        new Date().toISOString(),
      )

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: dto.mission_id,
        user_id: dto.user_id,
        org_id: dto.org_id ?? null,
        event_type: 'mission.subtask.cancelled',
        from_status: mission.status,
        to_status: mission.status,
        correlation_id: mission.correlation_id,
        payload: {
          subtask_id: dto.subtask_id,
          cancelled_subtask_ids: cancelIds,
          subtask_title: sub.title,
          ...(dto.idempotency_key ? { idempotency_key: dto.idempotency_key } : {}),
        },
      })

      await this.applyMissionAggregateUnlocked(supabase, dto.mission_id, dto.user_id, dto.org_id)
      return { ok: true, cancelled_count: cancelIds.length }
    })
  }

  async managerEditSubtask(dto: ManagerEditSubtaskDto) {
    const supabase = this.getServiceRoleClient()
    if (dto.idempotency_key) {
      const existing = await this.missionInternalRepository.findMissionLogByIdempotencyKey(
        supabase,
        {
          missionId: dto.mission_id,
          eventType: 'mission.subtask.edited',
          idempotencyKey: dto.idempotency_key,
        },
      )
      if (existing) return { ok: true, idempotent: true }
    }
    await this.missionsRepository.findMissionById(supabase, dto.mission_id, dto.user_id, dto.org_id)
    const sub = await this.missionInternalRepository.findManagerSubtask(
      supabase,
      {
        subtaskId: dto.subtask_id,
        missionId: dto.mission_id,
        userId: dto.user_id,
      },
      'id, status, intent',
    )
    if (!sub) throw new NotFoundException('Subtask not found')
    const st = String(sub.status)
    if (st === 'cancelled') {
      throw new BadRequestException('Cancelled subtasks cannot be edited')
    }
    if (dto.assigned_agent_key) {
      await this.assertAgentRegisteredForUser(
        supabase,
        dto.user_id,
        dto.assigned_agent_key,
        dto.org_id,
      )
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (dto.title !== undefined) updates.title = dto.title.trim().slice(0, 500)
    if (dto.assigned_agent_key !== undefined) updates.assigned_agent_key = dto.assigned_agent_key
    if (dto.dependsOn !== undefined) {
      const activeIds = await this.missionInternalRepository.listActiveSubtaskIds(
        supabase,
        dto.mission_id,
      )
      const invalidDependency = dto.dependsOn.find(
        (dependencyId) => dependencyId === dto.subtask_id || !activeIds.has(dependencyId),
      )
      if (invalidDependency) {
        throw new BadRequestException(
          `Dependency ${invalidDependency} must be another active subtask in this mission`,
        )
      }
      updates.depends_on = dto.dependsOn
    }
    if (dto.intent !== undefined) {
      const prev =
        sub.intent && typeof sub.intent === 'object' && !Array.isArray(sub.intent)
          ? (sub.intent as Record<string, unknown>)
          : {}
      updates.intent = { ...prev, ...dto.intent }
    }
    await this.missionInternalRepository.updateSubtaskById(supabase, dto.subtask_id, updates)

    const mission = await this.missionsRepository.findMissionById(
      supabase,
      dto.mission_id,
      dto.user_id,
      dto.org_id,
    )
    await this.missionsRepository.insertMissionLog(supabase, {
      mission_id: dto.mission_id,
      user_id: dto.user_id,
      org_id: dto.org_id ?? null,
      event_type: 'mission.subtask.edited',
      from_status: mission.status,
      to_status: mission.status,
      correlation_id: mission.correlation_id,
      payload: {
        subtask_id: dto.subtask_id,
        fields: Object.keys(updates).filter((k) => k !== 'updated_at'),
        ...(dto.idempotency_key ? { idempotency_key: dto.idempotency_key } : {}),
      },
    })
    return { ok: true }
  }

  async managerRetrySubtask(dto: ManagerRetrySubtaskDto) {
    const supabase = this.getServiceRoleClient()
    if (dto.idempotency_key) {
      const existing = await this.missionInternalRepository.findMissionLogByIdempotencyKey(
        supabase,
        {
          missionId: dto.mission_id,
          eventType: 'mission.subtask.retried',
          idempotencyKey: dto.idempotency_key,
        },
      )
      if (existing) return { ok: true, idempotent: true }
    }
    return this.postgresDirect.withMissionAdvisoryLock(dto.mission_id, async () => {
      const mission = await this.missionsRepository.findMissionById(
        supabase,
        dto.mission_id,
        dto.user_id,
        dto.org_id,
      )
      const sub = await this.missionInternalRepository.findManagerSubtask(
        supabase,
        {
          subtaskId: dto.subtask_id,
          missionId: dto.mission_id,
          userId: dto.user_id,
        },
        'id, status, title, scheduled_at',
      )
      if (!sub) throw new NotFoundException('Subtask not found')
      const retryableStatuses = new Set(['blocked', 'done', 'revision', 'pending', 'in_progress'])
      if (!retryableStatuses.has(String(sub.status))) {
        throw new BadRequestException(
          'Subtask can only be retried when blocked, done, revision, pending, or in_progress',
        )
      }

      await this.missionInternalRepository.resetSubtaskForRetry(
        supabase,
        dto.subtask_id,
        new Date().toISOString(),
      )

      if (['blocked', 'failed', 'error', 'review', 'done'].includes(mission.status)) {
        await this.missionsRepository.updateMissionStatus(
          supabase,
          dto.mission_id,
          dto.user_id,
          dto.org_id,
          {
            status: 'in_progress',
            error: null,
          },
        )
      }

      const scheduledAt = typeof sub.scheduled_at === 'string' ? sub.scheduled_at : undefined

      await this.missionOutboxService.enqueueOutboxEvent(supabase, {
        missionId: dto.mission_id,
        userId: dto.user_id,
        orgId: dto.org_id,
        eventType: 'mission.subtask.execute.requested',
        dedupeKey: `mission:${dto.mission_id}:subtask:${dto.subtask_id}:retry:${dto.idempotency_key || randomUUID()}`,
        priorityRank: priorityToRank(mission.priority),
        nextAttemptAt: scheduledAt,
        payload: {
          phase: 'execute',
          subtask_id: dto.subtask_id,
          requested_by: 'manager_retry_subtask',
        },
      })

      const retriedToInProgress = ['blocked', 'failed', 'error', 'review'].includes(mission.status)

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: dto.mission_id,
        user_id: dto.user_id,
        org_id: dto.org_id ?? null,
        event_type: 'mission.subtask.retried',
        from_status: mission.status,
        to_status: retriedToInProgress ? 'in_progress' : mission.status,
        correlation_id: mission.correlation_id,
        payload: {
          subtask_id: dto.subtask_id,
          subtask_title: sub.title,
          ...(dto.idempotency_key ? { idempotency_key: dto.idempotency_key } : {}),
        },
      })

      await this.applyMissionAggregateUnlocked(supabase, dto.mission_id, dto.user_id, dto.org_id)
      return { ok: true }
    })
  }
}
