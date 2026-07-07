import { randomUUID } from 'crypto'
import { BadRequestException } from '@nestjs/common'
import type { ManagerAmendFieldsDto, ManagerAppendSubtasksDto, ManagerPrepareReplanDto } from '../dto'
import { priorityToRank } from '../types/missions.types'
import { MissionInternalCallbackBase } from './mission-internal-callback.base'

export abstract class MissionInternalManagerScopeBase extends MissionInternalCallbackBase {
  async managerAmendFields(dto: ManagerAmendFieldsDto) {
    const supabase = this.getServiceRoleClient()
    if (dto.idempotency_key) {
      const existing = await this.missionInternalRepository.findMissionLogByIdempotencyKey(
        supabase,
        {
          missionId: dto.mission_id,
          eventType: 'mission.scope.amend',
          idempotencyKey: dto.idempotency_key,
        },
      )
      if (existing) return { ok: true, idempotent: true }
    }
    const mission = await this.missionsRepository.findMissionById(
      supabase,
      dto.mission_id,
      dto.user_id,
      dto.org_id,
    )
    const fields: Record<string, unknown> = {}
    if (dto.title && dto.title.trim()) fields.title = dto.title.trim()
    if (dto.brief && dto.brief.trim()) fields.brief = dto.brief.trim()
    if (dto.progress_notes && dto.progress_notes.trim())
      fields.progress_notes = dto.progress_notes.trim()
    if (dto.priority) fields.priority = dto.priority
    if (Object.keys(fields).length === 0) return { ok: true, noop: true }

    await this.missionsRepository.updateMissionFields(
      supabase,
      dto.mission_id,
      dto.user_id,
      dto.org_id,
      fields as any,
    )

    await this.missionsRepository.insertMissionLog(supabase, {
      mission_id: dto.mission_id,
      user_id: dto.user_id,
      org_id: dto.org_id ?? null,
      event_type: 'mission.scope.amend',
      from_status: mission.status,
      to_status: mission.status,
      correlation_id: mission.correlation_id,
      payload: {
        source: 'manager_review',
        amended_fields: Object.keys(fields),
        ...(dto.idempotency_key ? { idempotency_key: dto.idempotency_key } : {}),
      },
    })
    return { ok: true }
  }

  async managerAppendSubtasks(dto: ManagerAppendSubtasksDto) {
    const supabase = this.getServiceRoleClient()
    if (dto.idempotency_key) {
      const existing = await this.missionInternalRepository.findMissionLogByIdempotencyKey(
        supabase,
        {
          missionId: dto.mission_id,
          eventType: 'mission.scope.append_subtasks',
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

      const maxSortOrder = await this.missionInternalRepository.findLatestSubtaskSortOrder(
        supabase,
        dto.mission_id,
      )

      const uniqueAgentKeys = [...new Set(dto.subtasks.map((st) => st.assignTo))]
      for (const agentKey of uniqueAgentKeys) {
        await this.assertAgentRegisteredForUser(supabase, dto.user_id, agentKey, dto.org_id)
      }

      const existingActiveIds = await this.missionInternalRepository.listActiveSubtaskIds(
        supabase,
        dto.mission_id,
      )

      const subtaskIdMap = new Map<string, string>()
      for (const st of dto.subtasks) {
        subtaskIdMap.set(st.id, randomUUID())
      }
      const newMappedUUIDs = new Set(subtaskIdMap.values())

      const appendScheduleMap = new Map<string, string | null>()
      const rows = dto.subtasks.map((st, idx) => {
        const dbId = subtaskIdMap.get(st.id)!
        const dependsOn = (st.dependsOn || [])
          .map((depId) => subtaskIdMap.get(depId) || depId)
          .filter((id) => newMappedUUIDs.has(id) || existingActiveIds.has(id))
        appendScheduleMap.set(dbId, st.scheduledAt ?? null)
        return {
          id: dbId,
          mission_id: dto.mission_id,
          user_id: dto.user_id,
          title: st.title.trim().slice(0, 500),
          assigned_agent_key: st.assignTo,
          sort_order: maxSortOrder + 1 + idx,
          depends_on: dependsOn,
          intent: st.intent || {},
          scheduled_at: st.scheduledAt ?? null,
          output_contract: st.outputContract ?? null,
          contract_status: st.outputContract ? 'pending' : null,
          contract_verification: null,
          preflight_attempts: 0,
          correction_attempts: 0,
        }
      })

      await this.missionsRepository.createSubtasks(supabase, rows)

      for (const st of dto.subtasks) {
        const mappedId = subtaskIdMap.get(st.id)
        if (!mappedId) continue
        if ((st.dependsOn || []).length > 0) continue
        await this.missionOutboxService.enqueueOutboxEvent(supabase, {
          missionId: dto.mission_id,
          userId: dto.user_id,
          orgId: dto.org_id,
          eventType: 'mission.subtask.execute.requested',
          dedupeKey: `mission:${dto.mission_id}:subtask:${mappedId}:execute:append`,
          priorityRank: priorityToRank(mission.priority),
          nextAttemptAt: appendScheduleMap.get(mappedId) || undefined,
          payload: {
            phase: 'execute',
            subtask_id: mappedId,
            requested_by: 'manager_append',
          },
        })
      }

      if (['review', 'done', 'blocked', 'error', 'failed'].includes(mission.status)) {
        await this.missionsRepository.updateMissionStatus(
          supabase,
          dto.mission_id,
          dto.user_id,
          dto.org_id,
          {
            status: 'todo',
            current_agent_key: null,
            progress_notes: `Manager added ${dto.subtasks.length} new subtask(s)`,
            ...(mission.status === 'error' || mission.status === 'failed' ? { error: null } : {}),
          },
        )
      }

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: dto.mission_id,
        user_id: dto.user_id,
        org_id: dto.org_id ?? null,
        event_type: 'mission.scope.append_subtasks',
        from_status: mission.status,
        to_status: ['review', 'done', 'blocked', 'error', 'failed'].includes(mission.status)
          ? 'todo'
          : mission.status,
        correlation_id: mission.correlation_id,
        payload: {
          source: 'manager_review',
          subtask_count: dto.subtasks.length,
          subtask_titles: dto.subtasks.map((st) => st.title),
          ...(dto.idempotency_key ? { idempotency_key: dto.idempotency_key } : {}),
        },
      })
      return { ok: true, appended: dto.subtasks.length }
    })
  }

  async managerPrepareReplan(dto: ManagerPrepareReplanDto) {
    const supabase = this.getServiceRoleClient()
    if (dto.idempotency_key) {
      const existing = await this.missionInternalRepository.findMissionLogByIdempotencyKey(
        supabase,
        {
          missionId: dto.mission_id,
          eventType: 'mission.scope.replan',
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

      if (mission.status === 'pending_approval') {
        throw new BadRequestException(
          'Cannot replan a mission that is pending approval. Approve or reject the plan first.',
        )
      }

      const replanTimestamp = new Date().toISOString()
      const cancelledCount =
        await this.missionInternalRepository.cancelIncompleteSubtasksForMission(
          supabase,
          dto.mission_id,
          replanTimestamp,
        )

      const managerKey = await this.missionsRepository.findPrimaryManagerKey(
        supabase,
        dto.user_id,
        dto.org_id,
      )
      const rawInput =
        mission.input && typeof mission.input === 'object' && !Array.isArray(mission.input)
          ? (mission.input as Record<string, unknown>)
          : {}
      const inputWithReplanCtx = {
        ...rawInput,
        _replan_context: {
          reason: dto.reason || 'Manager requested full replan',
          cancelled_subtask_count: cancelledCount,
          timestamp: replanTimestamp,
        },
      }

      await this.missionInternalRepository.updateMissionForReplan(supabase, {
        missionId: dto.mission_id,
        userId: dto.user_id,
        managerKey,
        missionInput: inputWithReplanCtx,
        updatedAt: replanTimestamp,
      })

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: dto.mission_id,
        user_id: dto.user_id,
        org_id: dto.org_id ?? null,
        event_type: 'mission.scope.replan',
        from_status: mission.status,
        to_status: 'planning',
        agent_key: managerKey,
        correlation_id: mission.correlation_id,
        payload: {
          source: 'manager_review',
          reason: dto.reason || 'Manager requested full replan',
          cancelled_subtask_count: cancelledCount,
          ...(dto.idempotency_key ? { idempotency_key: dto.idempotency_key } : {}),
        },
      })

      await this.missionOutboxService.enqueueOutboxEvent(supabase, {
        missionId: dto.mission_id,
        userId: dto.user_id,
        orgId: dto.org_id,
        eventType: 'mission.plan.requested',
        dedupeKey: `mission:${dto.mission_id}:plan:replan`,
        requeueExistingDedupeKey: true,
        priorityRank: priorityToRank(mission.priority),
        payload: {
          phase: 'plan',
          requested_by: 'manager_replan',
          reason: dto.reason,
        },
      })

      return { ok: true, cancelled_subtask_count: cancelledCount }
    })
  }


}
