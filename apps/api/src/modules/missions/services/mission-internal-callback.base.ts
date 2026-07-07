import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  InternalMissionCallbackDto,
  InternalAwarenessCommentDto,
  InternalAwarenessNudgeSubtaskDto,
  InternalAwarenessProgressNotesDto,
  InternalAwarenessReassignDto,
  InternalAwarenessRetryDto,
} from '../dto'
import { priorityToRank } from '../types/missions.types'
import { MissionInternalRepositoryPlanBase } from './mission-internal-repository-plan.base'

export abstract class MissionInternalCallbackBase extends MissionInternalRepositoryPlanBase {
  async internalCallback(dto: InternalMissionCallbackDto) {
    if (this.useNativeMissionTx()) {
      return this.postgresDirect.withTransaction(async (client) => {
        await client.query('SELECT pg_advisory_lock(abs(hashtext($1::text))::bigint)', [
          dto.mission_id,
        ])
        try {
          const existingResult = await client.query(
            `
            SELECT *
            FROM missions
            WHERE id = $1::uuid
              AND user_id = $2::uuid
              AND org_id IS NOT DISTINCT FROM $3::uuid
            LIMIT 1
          `,
            [dto.mission_id, dto.user_id, dto.org_id ?? null],
          )
          const existing = existingResult.rows[0]
          if (!existing) throw new NotFoundException('Mission not found')

          const updateResult = await client.query(
            `
            UPDATE missions
            SET status = $3::text,
                updated_at = NOW(),
                error = $4::text,
                output = $5::jsonb,
                current_agent_key = $6::text,
                retry_count = $7::int,
                started_at = CASE WHEN $3::text = 'in_progress' THEN NOW() ELSE started_at END,
                completed_at = CASE
                  WHEN $3::text = ANY($9::text[]) THEN NOW()
                  ELSE completed_at
                END
            WHERE id = $1::uuid
              AND user_id = $2::uuid
              AND org_id IS NOT DISTINCT FROM $8::uuid
            RETURNING *
          `,
            [
              dto.mission_id,
              dto.user_id,
              dto.status,
              dto.error ?? null,
              JSON.stringify(dto.output ?? null),
              dto.current_agent_key ?? null,
              dto.retry_count ?? null,
              dto.org_id ?? null,
              ['done', 'error', 'failed'],
            ],
          )
          const updated = updateResult.rows[0]

          await client.query(
            `
            INSERT INTO missions_logs (
              mission_id,
              user_id,
              org_id,
              event_type,
              from_status,
              to_status,
              agent_key,
              correlation_id,
              payload
            )
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::text, $7::text, $8::uuid, $9::jsonb)
          `,
            [
              dto.mission_id,
              dto.user_id,
              dto.org_id ?? null,
              dto.event_type || 'mission.callback',
              existing.status,
              dto.status,
              dto.current_agent_key || updated.current_agent_key || null,
              updated.correlation_id,
              JSON.stringify({
                callback: true,
                ...(dto.event_payload || {}),
              }),
            ],
          )

          return updated
        } finally {
          try {
            await client.query('SELECT pg_advisory_unlock(abs(hashtext($1::text))::bigint)', [
              dto.mission_id,
            ])
          } catch {}
        }
      })
    }

    const supabase = this.getServiceRoleClient()
    return this.postgresDirect.withMissionAdvisoryLock(dto.mission_id, async () => {
      const existing = await this.missionsRepository.findMissionById(
        supabase,
        dto.mission_id,
        dto.user_id,
        dto.org_id,
      )

      const updated = await this.missionsRepository.updateMissionStatus(
        supabase,
        dto.mission_id,
        dto.user_id,
        dto.org_id,
        {
          status: dto.status,
          error: dto.error,
          output: dto.output,
          current_agent_key: dto.current_agent_key,
          retry_count: dto.retry_count,
        },
      )

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: dto.mission_id,
        user_id: dto.user_id,
        org_id: dto.org_id ?? null,
        event_type: dto.event_type || 'mission.callback',
        from_status: existing.status,
        to_status: dto.status,
        agent_key: dto.current_agent_key || updated.current_agent_key || undefined,
        correlation_id: updated.correlation_id,
        payload: {
          callback: true,
          ...(dto.event_payload || {}),
        },
      })

      return updated
    })
  }

  protected async assertAgentRegisteredForUser(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<void> {
    const data = await this.missionInternalRepository.findScopedAgentRegistration(
      supabase,
      userId,
      agentKey,
      orgId,
    )
    if (!data) throw new NotFoundException('Agent not registered for user')
    if (data.is_active === false) {
      throw new BadRequestException(`Agent '${agentKey}' is deactivated and cannot be assigned`)
    }
  }

  async internalAwarenessRetry(body: {
    user_id: string
    mission_id: string
    org_id?: string | null
    awareness_session_id?: string
  }) {
    const supabase = this.getServiceRoleClient()
    return this.missionLifecycleService.retry(
      supabase,
      body.user_id,
      body.mission_id,
      {
        retriedBy: 'awareness',
        awareness_session_id: body.awareness_session_id,
      },
      body.org_id,
    )
  }

  async internalAwarenessComment(body: {
    user_id: string
    mission_id: string
    org_id?: string | null
    message: string
    awareness_session_id?: string
  }) {
    const supabase = this.getServiceRoleClient()
    const mission = await this.missionsRepository.findMissionById(
      supabase,
      body.mission_id,
      body.user_id,
      body.org_id,
    )
    return this.missionsRepository.insertMissionLog(supabase, {
      mission_id: body.mission_id,
      user_id: body.user_id,
      org_id: body.org_id ?? null,
      event_type: 'awareness.comment',
      correlation_id: mission.correlation_id,
      payload: {
        message: body.message,
        source: 'awareness',
        ...(body.awareness_session_id ? { awareness_session_id: body.awareness_session_id } : {}),
      },
    })
  }

  async internalAwarenessReassign(body: {
    user_id: string
    mission_id: string
    org_id?: string | null
    assigned_agent_key: string
    awareness_session_id?: string
  }) {
    const supabase = this.getServiceRoleClient()
    await this.assertAgentRegisteredForUser(
      supabase,
      body.user_id,
      body.assigned_agent_key,
      body.org_id,
    )
    const existing = await this.missionsRepository.findMissionById(
      supabase,
      body.mission_id,
      body.user_id,
      body.org_id,
    )
    if (existing.status === 'done') {
      throw new BadRequestException('Cannot reassign a completed mission')
    }
    const updated = await this.missionsRepository.updateMissionFields(
      supabase,
      body.mission_id,
      body.user_id,
      body.org_id,
      {
        assigned_agent_key: body.assigned_agent_key,
        current_agent_key: body.assigned_agent_key,
      },
    )
    await this.missionsRepository.insertMissionLog(supabase, {
      mission_id: body.mission_id,
      user_id: body.user_id,
      org_id: body.org_id ?? null,
      event_type: 'awareness.reassigned',
      from_status: existing.status,
      to_status: existing.status,
      agent_key: body.assigned_agent_key,
      correlation_id: updated.correlation_id,
      payload: {
        source: 'awareness',
        previous_assigned_agent_key: existing.assigned_agent_key,
        ...(body.awareness_session_id ? { awareness_session_id: body.awareness_session_id } : {}),
      },
    })
    return updated
  }

  async internalAwarenessNudgeSubtask(body: {
    user_id: string
    mission_id: string
    org_id?: string | null
    subtask_id: string
    awareness_session_id?: string
  }) {
    const supabase = this.getServiceRoleClient()
    const sub = await this.missionInternalRepository.findAwarenessSubtask(supabase, {
      subtaskId: body.subtask_id,
      missionId: body.mission_id,
      userId: body.user_id,
    })
    if (!sub) throw new NotFoundException('Subtask not found')

    const mission = await this.missionsRepository.findMissionById(
      supabase,
      body.mission_id,
      body.user_id,
      body.org_id,
    )

    if (mission.status === 'pending_approval') {
      return { ok: false, reason: 'mission_pending_approval' }
    }

    await this.missionOutboxService.enqueueOutboxEvent(supabase, {
      missionId: body.mission_id,
      userId: body.user_id,
      orgId: body.org_id,
      eventType: 'mission.subtask.execute.requested',
      dedupeKey: body.awareness_session_id
        ? `mission:${body.mission_id}:subtask:${body.subtask_id}:awareness:${body.awareness_session_id}`
        : `mission:${body.mission_id}:subtask:${body.subtask_id}:awareness-nudge`,
      priorityRank: priorityToRank(mission.priority),
      nextAttemptAt: sub.scheduled_at || undefined,
      payload: {
        phase: 'execute',
        subtask_id: body.subtask_id,
        requested_by: 'awareness_nudge',
        ...(body.awareness_session_id ? { awareness_session_id: body.awareness_session_id } : {}),
      },
    })

    await this.missionsRepository.insertMissionLog(supabase, {
      mission_id: body.mission_id,
      user_id: body.user_id,
      org_id: body.org_id ?? null,
      event_type: 'awareness.subtask_nudged',
      correlation_id: mission.correlation_id,
      payload: {
        subtask_id: body.subtask_id,
        source: 'awareness',
        ...(body.awareness_session_id ? { awareness_session_id: body.awareness_session_id } : {}),
      },
    })

    return { ok: true }
  }

  async internalAwarenessProgressNotes(body: {
    user_id: string
    mission_id: string
    org_id?: string | null
    note: string
    awareness_session_id?: string
  }) {
    const supabase = this.getServiceRoleClient()
    const existing = await this.missionsRepository.findMissionById(
      supabase,
      body.mission_id,
      body.user_id,
      body.org_id,
    )
    const updated = await this.missionsRepository.updateMissionFields(
      supabase,
      body.mission_id,
      body.user_id,
      body.org_id,
      { progress_notes: body.note },
    )
    await this.missionsRepository.insertMissionLog(supabase, {
      mission_id: body.mission_id,
      user_id: body.user_id,
      org_id: body.org_id ?? null,
      event_type: 'awareness.progress_notes',
      from_status: existing.status,
      to_status: existing.status,
      correlation_id: updated.correlation_id,
      payload: {
        source: 'awareness',
        ...(body.awareness_session_id ? { awareness_session_id: body.awareness_session_id } : {}),
      },
    })
    return updated
  }


}
