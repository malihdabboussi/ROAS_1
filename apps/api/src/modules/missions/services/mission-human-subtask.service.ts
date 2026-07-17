import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoggerService, PostgresDirectService, type SubtaskStatus } from '@vibey/api-shared'
import type {
  BlockHumanSubtaskDto,
  BounceSubtaskToAgentDto,
  CompleteHumanSubtaskDto,
  ReassignHumanSubtaskDto,
} from '../dto'
import {
  MissionHumanSubtaskRepository,
  type MissionHumanAdvanceSubtaskRow,
  type MissionHumanOwnerScope,
} from '../repositories/mission-human-subtask.repository'
import { MissionServiceRoleClientRepository } from '../repositories/mission-service-role-client.repository'
import { MissionsRepository } from '../repositories/missions.repository'
import { priorityToRank } from '../types/missions.types'
import { MissionOutboxService } from './mission-outbox.service'

const HUMAN_SUBTASK_SLA_MS = 48 * 60 * 60 * 1000
const HUMAN_AGENT_KEY = 'human'

/**
 * Human-facing subtask actions (complete / bounce / reassign / block).
 * Kept separate from MissionInternalService (which is already >2000 LOC) so each
 * human action is easy to find, test, and audit. See plan phase 2.1 file-size note.
 */
@Injectable()
export class MissionHumanSubtaskService {
  private readonly metrics = new Logger('HumanSubtaskMetrics')

  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly postgresDirect: PostgresDirectService,
    private readonly missionOutboxService: MissionOutboxService,
    private readonly logger: LoggerService,
    private readonly humanSubtaskRepository: MissionHumanSubtaskRepository,
    private readonly serviceRoleClientRepository: MissionServiceRoleClientRepository,
  ) {}

  private getServiceRoleClient(): SupabaseClient {
    return this.serviceRoleClientRepository.getClient()
  }

  private async loadSubtask(
    supabase: SupabaseClient,
    missionId: string,
    subtaskId: string,
  ): Promise<Record<string, unknown>> {
    const subtask = await this.humanSubtaskRepository.loadSubtask(supabase, missionId, subtaskId)
    if (!subtask) throw new NotFoundException('Subtask not found')
    return subtask
  }

  private assertAssignedTo(subtask: Record<string, unknown>, userId: string) {
    if (subtask.assignee_type !== 'human' || subtask.assigned_user_id !== userId) {
      throw new ForbiddenException('You are not the assigned human for this subtask')
    }
  }

  private async getMissionOwnerScope(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<MissionHumanOwnerScope> {
    const mission = await this.humanSubtaskRepository.getMissionOwnerScope(supabase, missionId)
    if (!mission) throw new NotFoundException('Mission not found')
    return mission
  }

  async completeHuman(
    actorUserId: string,
    missionId: string,
    subtaskId: string,
    body: CompleteHumanSubtaskDto,
  ) {
    const supabase = this.getServiceRoleClient()
    return this.postgresDirect.withMissionAdvisoryLock(missionId, async () => {
      const subtask = await this.loadSubtask(supabase, missionId, subtaskId)
      this.assertAssignedTo(subtask, actorUserId)
      if (['done', 'cancelled'].includes(String(subtask.status))) {
        throw new BadRequestException('Subtask is already resolved')
      }
      const mission = await this.getMissionOwnerScope(supabase, missionId)

      const files = body.files ?? []
      const links = body.links ?? []
      const firstFile = files[0]
      const shouldCreateDeliverable = files.length > 0 || links.length > 0

      // Gate approvals (approve & continue with no attached files) should not create
      // user-facing docs — audit trail lives on subtask output + mission log.
      const deliverable = shouldCreateDeliverable
        ? await this.missionsRepository.createDeliverable(supabase, {
            mission_id: missionId,
            user_id: mission.user_id,
            org_id: mission.org_id ?? null,
            agent_key: HUMAN_AGENT_KEY,
            type: firstFile ? 'file' : 'doc',
            title: String(subtask.title || 'Human deliverable'),
            content: body.summary,
            file_url: firstFile?.url,
            file_name: firstFile?.name,
            file_size: firstFile?.size,
            mime_type: firstFile?.mime_type,
            metadata: {
              source: 'human',
              completed_by_user_id: actorUserId,
              subtask_id: subtaskId,
              files,
              links,
            },
          })
        : null
      const deliverableId = (deliverable as { id?: string } | null)?.id ?? null

      const output = {
        artifact_manifest: [
          ...files.map((f) => ({ kind: 'file', url: f.url, name: f.name })),
          ...links.map((l) => ({ kind: 'link', url: l.url, label: l.label })),
        ],
        summary: body.summary,
        completed_by_human: true,
        completed_by_user_id: actorUserId,
        deliverable_id: deliverableId,
      }

      const nowIso = new Date().toISOString()
      const updateError = await this.humanSubtaskRepository.markHumanSubtaskDone(
        supabase,
        missionId,
        subtaskId,
        {
          status: 'done',
          output,
          deliverable_id: deliverableId,
          awaiting_human_since: null,
          sla_escalate_at: null,
          sla_escalated_at: null,
          bounce_reason: null,
          updated_at: nowIso,
        },
      )
      if (updateError) {
        await this.logger.logError({
          severity: 'error',
          feature: 'missions/complete-human',
          error_code: 'DB_ERROR',
          message: 'Failed to mark human subtask done',
          context: {
            actorUserId,
            missionId,
            subtaskId,
            error: updateError,
          },
        })
        throw new Error(updateError)
      }

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: mission.user_id,
        org_id: mission.org_id ?? null,
        event_type: 'mission.subtask.human_completed',
        from_status: subtask.status as SubtaskStatus,
        to_status: 'done',
        correlation_id: (mission.correlation_id as string | undefined) ?? undefined,
        payload: {
          subtask_id: subtaskId,
          completed_by_user_id: actorUserId,
          deliverable_id: deliverableId,
        },
      })

      // Advance the mission: enqueue any now-ready dependents, or request review if everything
      // active is done. Mirrors the agent-execute completion path — `mission.subtask.completed`
      // is not a supported outbox event_type so we emit the concrete downstream events directly.
      await this.advanceMissionAfterSubtaskDone(supabase, missionId, subtaskId, mission)

      this.metrics.log(
        `metric=human_subtask_completed mission=${missionId} subtask=${subtaskId} user=${actorUserId}`,
      )
      return { ok: true, deliverable_id: deliverableId }
    })
  }

  async bounceToAgent(
    actorUserId: string,
    missionId: string,
    subtaskId: string,
    body: BounceSubtaskToAgentDto,
  ) {
    const supabase = this.getServiceRoleClient()
    return this.postgresDirect.withMissionAdvisoryLock(missionId, async () => {
      const subtask = await this.loadSubtask(supabase, missionId, subtaskId)
      this.assertAssignedTo(subtask, actorUserId)
      if (['done', 'cancelled'].includes(String(subtask.status))) {
        throw new BadRequestException('Subtask is already resolved')
      }
      const mission = await this.getMissionOwnerScope(supabase, missionId)

      const agent = await this.humanSubtaskRepository.findAgentInMissionOrg(
        supabase,
        mission.org_id,
        body.agent_key,
      )
      if (!agent) {
        throw new BadRequestException(`Agent "${body.agent_key}" is not in this org`)
      }

      const nowIso = new Date().toISOString()
      await this.humanSubtaskRepository.bounceSubtaskToAgent(supabase, missionId, subtaskId, {
        status: 'pending',
        assignee_type: 'agent',
        assigned_agent_key: body.agent_key,
        assigned_user_id: null,
        awaiting_human_since: null,
        sla_escalate_at: null,
        sla_escalated_at: null,
        bounce_reason: body.reason,
        updated_at: nowIso,
      })

      await this.missionOutboxService.enqueueOutboxEvent(supabase, {
        missionId,
        userId: mission.user_id,
        orgId: mission.org_id,
        eventType: 'mission.subtask.execute.requested',
        dedupeKey: `mission:${missionId}:subtask:${subtaskId}:execute:bounce:${Date.now()}`,
        priorityRank: priorityToRank(mission.priority),
        payload: {
          phase: 'execute',
          subtask_id: subtaskId,
          requested_by: 'human_bounce',
        },
      })

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: mission.user_id,
        org_id: mission.org_id ?? null,
        event_type: 'mission.subtask.bounced_to_agent',
        from_status: subtask.status as SubtaskStatus,
        to_status: 'pending',
        correlation_id: (mission.correlation_id as string | undefined) ?? undefined,
        payload: {
          subtask_id: subtaskId,
          from_user_id: actorUserId,
          to_agent_key: body.agent_key,
          reason: body.reason,
        },
      })

      this.metrics.log(
        `metric=human_subtask_bounced_to_agent mission=${missionId} subtask=${subtaskId} from_user=${actorUserId} to_agent=${body.agent_key}`,
      )
      return { ok: true, bounced_to_agent: body.agent_key }
    })
  }

  async reassignHuman(
    actorUserId: string,
    missionId: string,
    subtaskId: string,
    body: ReassignHumanSubtaskDto,
  ) {
    const supabase = this.getServiceRoleClient()
    return this.postgresDirect.withMissionAdvisoryLock(missionId, async () => {
      const subtask = await this.loadSubtask(supabase, missionId, subtaskId)
      const mission = await this.getMissionOwnerScope(supabase, missionId)

      const isOwner = actorUserId === mission.user_id
      const isCurrentAssignee =
        subtask.assignee_type === 'human' && subtask.assigned_user_id === actorUserId
      if (!isOwner && !isCurrentAssignee) {
        throw new ForbiddenException('Only the owner or current assignee can reassign a subtask')
      }
      if (['done', 'cancelled'].includes(String(subtask.status))) {
        throw new BadRequestException('Subtask is already resolved')
      }

      if (!mission.org_id) {
        throw new BadRequestException('Mission has no org — cannot reassign to a human')
      }
      const membership = await this.humanSubtaskRepository.findOrgMemberForHumanAssignment(
        supabase,
        mission.org_id,
        body.user_id,
      )
      if (!membership || membership.status !== 'active') {
        throw new BadRequestException('Target user is not an active org member')
      }
      const profile = await this.humanSubtaskRepository.findProfileAssignmentPreference(
        supabase,
        body.user_id,
      )
      if (profile?.accepts_agent_assignments === false) {
        throw new BadRequestException('Target user has turned off agent-assigned work')
      }

      const nowIso = new Date().toISOString()
      await this.humanSubtaskRepository.reassignSubtaskToHuman(supabase, missionId, subtaskId, {
        status: 'awaiting_human',
        assignee_type: 'human',
        assigned_agent_key: null,
        assigned_user_id: body.user_id,
        awaiting_human_since: nowIso,
        sla_escalate_at: new Date(Date.now() + HUMAN_SUBTASK_SLA_MS).toISOString(),
        sla_escalated_at: null,
        bounce_reason: null,
        updated_at: nowIso,
      })

      await this.missionOutboxService.enqueueOutboxEvent(supabase, {
        missionId,
        userId: mission.user_id,
        orgId: mission.org_id,
        eventType: 'mission.subtask.awaiting_human.requested',
        dedupeKey: `mission:${missionId}:subtask:${subtaskId}:awaiting_human:reassign:${Date.now()}`,
        priorityRank: priorityToRank(mission.priority),
        payload: {
          phase: 'awaiting_human',
          subtask_id: subtaskId,
          assigned_user_id: body.user_id,
          requested_by: 'human_reassign',
          reason: body.reason ?? null,
        },
      })

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: mission.user_id,
        org_id: mission.org_id ?? null,
        event_type: 'mission.subtask.reassigned_human',
        from_status: subtask.status as SubtaskStatus,
        to_status: 'awaiting_human',
        correlation_id: (mission.correlation_id as string | undefined) ?? undefined,
        payload: {
          subtask_id: subtaskId,
          from_user_id: subtask.assigned_user_id,
          to_user_id: body.user_id,
          reason: body.reason ?? null,
        },
      })

      return { ok: true, reassigned_to: body.user_id }
    })
  }

  async blockHuman(
    actorUserId: string,
    missionId: string,
    subtaskId: string,
    body: BlockHumanSubtaskDto,
  ) {
    const supabase = this.getServiceRoleClient()
    return this.postgresDirect.withMissionAdvisoryLock(missionId, async () => {
      const subtask = await this.loadSubtask(supabase, missionId, subtaskId)
      this.assertAssignedTo(subtask, actorUserId)
      if (['done', 'cancelled'].includes(String(subtask.status))) {
        throw new BadRequestException('Subtask is already resolved')
      }
      const mission = await this.getMissionOwnerScope(supabase, missionId)

      const nowIso = new Date().toISOString()
      await this.humanSubtaskRepository.blockHumanSubtask(supabase, missionId, subtaskId, {
        status: 'blocked',
        awaiting_human_since: null,
        sla_escalate_at: null,
        sla_escalated_at: null,
        bounce_reason: body.reason,
        feedback: body.reason,
        updated_at: nowIso,
      })

      const notificationError = await this.humanSubtaskRepository.insertSubtaskBlockedNotification(
        supabase,
        {
          user_id: mission.user_id,
          org_id: mission.org_id ?? null,
          type: 'subtask_blocked',
          title: `"${mission.title || 'Mission'}" needs you`,
          body: body.reason,
          mission_id: missionId,
        },
      )
      if (notificationError) {
        throw new BadRequestException(notificationError)
      }

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: mission.user_id,
        org_id: mission.org_id ?? null,
        event_type: 'mission.subtask.human_blocked',
        from_status: subtask.status as SubtaskStatus,
        to_status: 'blocked',
        correlation_id: (mission.correlation_id as string | undefined) ?? undefined,
        payload: {
          subtask_id: subtaskId,
          blocked_by_user_id: actorUserId,
          reason: body.reason,
        },
      })

      return { ok: true }
    })
  }

  /**
   * After a human subtask flips to `done`, advance the mission:
   *  - For every subtask that depends on the completed one, check if all its deps are now
   *    `done` / `cancelled`. If yes and it's a root-ready human row, flip to `awaiting_human`
   *    and fire the notifier event. If it's an agent row in `pending`, enqueue execute.
   *  - If every active subtask is `done` / `cancelled`, enqueue `mission.review.requested`
   *    and move the mission to `review`.
   *
   * This mirrors the completion semantics of `mission-execute-phase.service.ts` so agent
   * and human completions drive the same downstream behavior.
   */
  private async advanceMissionAfterSubtaskDone(
    supabase: SupabaseClient,
    missionId: string,
    completedSubtaskId: string,
    mission: {
      user_id: string
      org_id: string | null
      correlation_id: string | null
      priority: string | null
      title: string | null
    },
  ): Promise<void> {
    const rows = await this.humanSubtaskRepository.listSubtasksForHumanAdvance(supabase, missionId)
    const statusById = new Map(rows.map((r) => [r.id, r.status]))

    const active = rows.filter((r) => r.status !== 'cancelled')
    const allDone = active.length > 0 && active.every((r) => r.status === 'done')

    if (allDone) {
      await this.humanSubtaskRepository.moveMissionToReview(supabase, missionId)

      await this.missionOutboxService.enqueueOutboxEvent(supabase, {
        missionId,
        userId: mission.user_id,
        orgId: mission.org_id,
        eventType: 'mission.review.requested',
        dedupeKey: `mission:${missionId}:review:human-complete-done-${Date.now()}`,
        requeueExistingDedupeKey: true,
        priorityRank: priorityToRank(mission.priority),
        payload: {
          phase: 'review',
          requested_by: 'human_complete_all_done',
          last_completed_subtask_id: completedSubtaskId,
        },
      })
      return
    }

    // Otherwise, unblock any dependents that are now runnable.
    const nowReady = rows.filter((r) => {
      if (r.status !== 'pending') return false
      const deps = Array.isArray(r.depends_on) ? r.depends_on.map(String) : []
      if (deps.length === 0) return false
      return deps.every((d) => {
        const st = statusById.get(d)
        return st === 'done' || st === 'cancelled'
      })
    })

    const nowIso = new Date().toISOString()
    for (const dep of nowReady as MissionHumanAdvanceSubtaskRow[]) {
      if (dep.assignee_type === 'human') {
        if (!dep.assigned_user_id) continue
        await this.humanSubtaskRepository.moveDependentHumanSubtaskAwaiting(supabase, dep.id, {
          status: 'awaiting_human',
          awaiting_human_since: nowIso,
          sla_escalate_at: new Date(Date.now() + HUMAN_SUBTASK_SLA_MS).toISOString(),
          updated_at: nowIso,
        })
        await this.missionOutboxService.enqueueOutboxEvent(supabase, {
          missionId,
          userId: mission.user_id,
          orgId: mission.org_id,
          eventType: 'mission.subtask.awaiting_human.requested',
          dedupeKey: `mission:${missionId}:subtask:${dep.id}:awaiting_human:dep-resolved-${Date.now()}`,
          priorityRank: priorityToRank(mission.priority),
          payload: {
            phase: 'awaiting_human',
            subtask_id: dep.id,
            assigned_user_id: dep.assigned_user_id,
            requested_by: 'dep_resolved_by_human',
          },
        })
      } else {
        await this.missionOutboxService.enqueueOutboxEvent(supabase, {
          missionId,
          userId: mission.user_id,
          orgId: mission.org_id,
          eventType: 'mission.subtask.execute.requested',
          dedupeKey: `mission:${missionId}:subtask:${dep.id}:execute:dep-resolved-${Date.now()}`,
          nextAttemptAt: dep.scheduled_at || undefined,
          priorityRank: priorityToRank(mission.priority),
          payload: {
            phase: 'execute',
            subtask_id: dep.id,
            requested_by: 'dep_resolved_by_human',
          },
        })
      }
    }
  }
}
