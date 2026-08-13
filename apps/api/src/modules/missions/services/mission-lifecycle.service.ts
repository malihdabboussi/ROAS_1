import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PostgresDirectService } from '@vibey/api-shared'
import type { OrgRole } from '@vibey/api-shared'
import { SpacePermissionsService } from '../../spaces/services/space-permissions.service'
import type {
  AddMissionCommentDto,
  CreateMissionDto,
  MissionListQuery,
  UpdateMissionDto,
  UpdateMissionStatusDto,
  UpdateSubtaskDto,
} from '../dto'
import { MISSION_COMMENT_DIRECTIVE_EXECUTOR_KEY } from '../mission-comment-directive.constants'
import { MissionsRepository } from '../repositories/missions.repository'
import { priorityToRank } from '../types/missions.types'
import { MissionCreateCoordinatorService } from './mission-create-coordinator.service'
import { MissionLifecycleNativeTxService } from './mission-lifecycle-native-tx.service'
import { MissionListSummaryService } from './mission-list-summary.service'
import { MissionOutboxService } from './mission-outbox.service'
import { MissionPermissionsService } from './mission-permissions.service'

@Injectable()
export class MissionLifecycleService {
  private readonly logger = new Logger(MissionLifecycleService.name)

  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly postgresDirect: PostgresDirectService,
    private readonly missionOutboxService: MissionOutboxService,
    private readonly missionPermissions: MissionPermissionsService,
    private readonly spacePermissions: SpacePermissionsService,
    private readonly missionListSummary: MissionListSummaryService = new MissionListSummaryService(),
    nativeTxService?: MissionLifecycleNativeTxService,
    missionCreateCoordinator?: MissionCreateCoordinatorService,
  ) {
    this.nativeTxService =
      nativeTxService ?? new MissionLifecycleNativeTxService(this.postgresDirect)
    this.missionCreateCoordinator =
      missionCreateCoordinator ??
      new MissionCreateCoordinatorService(
        this.missionsRepository,
        this.postgresDirect,
        this.missionOutboxService,
        this.spacePermissions,
        this.nativeTxService,
      )
  }

  private readonly nativeTxService: MissionLifecycleNativeTxService
  private readonly missionCreateCoordinator: MissionCreateCoordinatorService

  private useNativeMissionTx(): boolean {
    return this.nativeTxService.isEnabled()
  }

  async list(
    supabase: SupabaseClient,
    userId: string,
    query: MissionListQuery,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    const missions = await this.missionsRepository.listMissions(supabase, userId, orgId, {
      status: query.status,
      campaign_id: query.campaign_id,
      space_id: query.space_id,
      agent_keys: query.agent_keys,
      limit: query.limit,
    })

    const visibleMissions = await this.missionPermissions.filterVisibleMissions(
      supabase,
      userId,
      orgRole,
      missions as Record<string, unknown>[],
      orgId,
    )

    if (visibleMissions.length === 0) return visibleMissions
    return this.missionListSummary.appendSubtaskSummaries(supabase, visibleMissions)
  }

  async getById(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
    requiredLevel: 'view' | 'comment' | 'edit' | 'admin' = 'view',
  ) {
    try {
      const mission = (await this.missionsRepository.findMissionById(
        supabase,
        missionId,
        userId,
        orgId,
      )) as Record<string, unknown>
      const level = await this.missionPermissions.assertCanAccessMission(
        supabase,
        userId,
        orgRole,
        mission,
        requiredLevel,
        orgId,
      )
      return this.missionPermissions.redactMission(mission, level) as any
    } catch (error) {
      const message = (error as Error).message
      if (message === 'Mission not found') {
        this.logger.warn(`Mission ${missionId} not found`)
      } else {
        this.logger.error(`Failed to fetch mission ${missionId}: ${message}`)
      }
      throw new NotFoundException('Mission not found')
    }
  }

  async getLogs(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    await this.getById(supabase, userId, missionId, orgId, orgRole, 'edit')
    return this.missionsRepository.listMissionLogs(supabase, missionId, userId, orgId)
  }

  async addUserComment(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    dto: AddMissionCommentDto,
    orgId?: string | null,
  ) {
    if (this.useNativeMissionTx()) {
      return this.nativeTxService.addUserCommentTransactional(userId, missionId, dto, orgId)
    }

    return this.postgresDirect.withMissionAdvisoryLock(missionId, async () => {
      const mission = await this.getById(supabase, userId, missionId, orgId)
      const missionOwnerId = String(mission.user_id)
      const commentLog = await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: missionOwnerId,
        org_id: orgId ?? null,
        event_type: 'user.comment',
        payload: {
          message: dto.message,
          commented_by_user_id: userId,
          ...(dto.attachments?.length ? { attachments: dto.attachments } : {}),
        },
      })

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: missionOwnerId,
        org_id: orgId ?? null,
        event_type: 'mission.comment.triage.requested',
        from_status: mission.status,
        to_status: mission.status,
        agent_key: MISSION_COMMENT_DIRECTIVE_EXECUTOR_KEY,
        correlation_id: mission.correlation_id,
        payload: {
          reason: 'user_comment_directive',
          comment_id: commentLog.id,
        },
      })

      await this.missionOutboxService.enqueueOutboxEvent(supabase, {
        missionId,
        userId: missionOwnerId,
        orgId,
        eventType: 'mission.comment.directive',
        dedupeKey: `mission:${missionId}:directive:comment:${commentLog.id}`,
        priorityRank: priorityToRank(mission.priority),
        payload: {
          comment_id: commentLog.id,
          comment_message: dto.message,
          from_status: mission.status,
          correlation_id: mission.correlation_id,
        },
      })

      return commentLog
    })
  }

  async create(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateMissionDto,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    return this.missionCreateCoordinator.create(supabase, userId, dto, orgId, orgRole)
  }

  async updateStatus(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    dto: UpdateMissionStatusDto,
    orgId?: string | null,
  ) {
    return this.postgresDirect.withMissionAdvisoryLock(missionId, async () => {
      const existing = await this.getById(supabase, userId, missionId, orgId)
      const missionOwnerId = String(existing.user_id)

      if (existing.status === 'inbox' && dto.status !== 'inbox' && !existing.campaign_id) {
        throw new Error('Cannot start a mission without a campaign. Assign a campaign first.')
      }

      const updated = await this.missionsRepository.updateMissionStatus(
        supabase,
        missionId,
        missionOwnerId,
        orgId,
        dto,
      )

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: missionOwnerId,
        org_id: orgId ?? null,
        event_type: 'mission.status.updated',
        from_status: existing.status,
        to_status: dto.status,
        agent_key: dto.current_agent_key || updated.current_agent_key || undefined,
        correlation_id: updated.correlation_id,
        payload: {
          retry_count: dto.retry_count,
          error: dto.error,
          updated_by_user_id: userId,
        },
      })

      return updated
    })
  }

  async updateMission(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    dto: UpdateMissionDto,
    orgId?: string | null,
  ) {
    const existing = await this.getById(supabase, userId, missionId, orgId)
    const missionOwnerId = String(existing.user_id)
    const updated = await this.missionsRepository.updateMissionFields(
      supabase,
      missionId,
      missionOwnerId,
      orgId,
      dto,
    )

    await this.missionsRepository.insertMissionLog(supabase, {
      mission_id: missionId,
      user_id: missionOwnerId,
      org_id: orgId ?? null,
      event_type: 'mission.updated',
      from_status: existing.status,
      to_status: updated.status,
      agent_key: updated.current_agent_key || updated.assigned_agent_key || undefined,
      correlation_id: updated.correlation_id,
      payload: {
        title: dto.title,
        brief: dto.brief,
        priority: dto.priority,
        scheduled_at: dto.scheduled_at,
        updated_by_user_id: userId,
      },
    })

    return updated
  }

  async retry(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    opts?: { retriedBy?: 'user' | 'awareness'; awareness_session_id?: string },
    orgId?: string | null,
  ) {
    if (this.useNativeMissionTx()) {
      return this.nativeTxService.retryTransactional(userId, missionId, opts, orgId)
    }

    const retriedBy = opts?.retriedBy ?? 'user'
    return this.postgresDirect.withMissionAdvisoryLock(missionId, async () => {
      const existing = await this.getById(supabase, userId, missionId, orgId)
      const missionOwnerId = String(existing.user_id)
      if (existing.status !== 'error' && existing.status !== 'failed') {
        throw new ConflictException('Only error or failed missions can be retried')
      }

      const updated = await this.missionsRepository.updateMissionStatus(
        supabase,
        missionId,
        missionOwnerId,
        orgId,
        {
          status: 'inbox',
          error: null,
          current_agent_key: undefined,
        },
      )

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: missionOwnerId,
        org_id: orgId ?? null,
        event_type: 'mission.retried',
        from_status: existing.status,
        to_status: 'inbox',
        correlation_id: updated.correlation_id,
        payload: {
          retried_by: retriedBy,
          requested_by_user_id: userId,
          ...(opts?.awareness_session_id
            ? { awareness_session_id: opts.awareness_session_id }
            : {}),
        },
      })

      await this.missionOutboxService.enqueueOutboxEvent(supabase, {
        missionId,
        userId: missionOwnerId,
        orgId,
        eventType: 'mission.plan.requested',
        dedupeKey: `mission:${missionId}:plan:retry`,
        requeueExistingDedupeKey: true,
        priorityRank: priorityToRank(existing.priority),
        payload: {
          requested_by: retriedBy === 'awareness' ? 'awareness_retry' : 'retry',
          ...(opts?.awareness_session_id
            ? { awareness_session_id: opts.awareness_session_id }
            : {}),
        },
      })

      return updated
    })
  }

  async trash(supabase: SupabaseClient, userId: string, missionId: string, orgId?: string | null) {
    const existing = await this.getById(supabase, userId, missionId, orgId)
    const missionOwnerId = String(existing.user_id)

    await this.missionsRepository.insertMissionLog(supabase, {
      mission_id: missionId,
      user_id: missionOwnerId,
      org_id: orgId ?? null,
      event_type: 'mission.trashed',
      from_status: existing.status,
      to_status: existing.status,
      correlation_id: existing.correlation_id,
      payload: { trashed_by: 'user', requested_by_user_id: userId },
    })

    await this.missionsRepository.deleteMission(supabase, missionId, missionOwnerId, orgId)

    return { deleted: true }
  }

  async bulkUpdate(
    supabase: SupabaseClient,
    userId: string,
    updates: Array<{ id: string; status?: string; sort_order?: number }>,
    orgId?: string | null,
  ) {
    return this.missionsRepository.bulkUpdateMissions(supabase, userId, orgId, updates)
  }

  async getPlan(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
  ) {
    await this.getById(supabase, userId, missionId, orgId, null, 'edit')
    return this.missionsRepository.findPlanByMissionId(supabase, missionId)
  }

  async getDeliverables(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
  ) {
    await this.getById(supabase, userId, missionId, orgId, null, 'edit')
    return this.missionsRepository.listDeliverables(supabase, missionId)
  }

  async listSubtasks(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
  ) {
    await this.getById(supabase, userId, missionId, orgId, null, 'edit')
    return this.missionsRepository.listSubtasks(supabase, missionId)
  }

  async updateSubtask(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    subtaskId: string,
    dto: UpdateSubtaskDto,
    orgId?: string | null,
  ) {
    await this.getById(supabase, userId, missionId, orgId, null, 'edit')
    const existing = await this.missionsRepository.getSubtaskById(
      supabase,
      subtaskId,
      userId,
      orgId,
    )
    const updates: Record<string, unknown> = {}
    if (dto.status !== undefined) updates.status = dto.status
    if (dto.assigned_agent_key !== undefined) updates.assigned_agent_key = dto.assigned_agent_key
    if (dto.feedback !== undefined) updates.feedback = dto.feedback
    if (dto.scheduled_at !== undefined) updates.scheduled_at = dto.scheduled_at
    const result = await this.missionsRepository.updateSubtask(
      supabase,
      subtaskId,
      userId,
      orgId,
      updates,
    )

    if (dto.scheduled_at !== undefined) {
      const newNextAttempt = dto.scheduled_at || new Date().toISOString()
      await this.missionsRepository.reschedulePendingSubtaskExecutionOutbox(
        supabase,
        missionId,
        subtaskId,
        newNextAttempt,
      )
    }

    const statusChanged =
      dto.status !== undefined && existing && String(existing.status) !== String(dto.status)
    const assigneeChanged =
      dto.assigned_agent_key !== undefined &&
      existing &&
      String(existing.assigned_agent_key || '') !== String(dto.assigned_agent_key || '')
    if (statusChanged || assigneeChanged) {
      const title = String(result?.title || existing?.title || 'Subtask')
      const note = statusChanged
        ? `Subtask "${title}" marked ${dto.status}`
        : `Subtask "${title}" reassigned to ${dto.assigned_agent_key}`
      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: userId,
        org_id: orgId ?? null,
        event_type: statusChanged
          ? 'mission.subtask.status_updated'
          : 'mission.subtask.reassigned',
        agent_key: (result?.assigned_agent_key as string | null) ?? undefined,
        payload: {
          subtask_id: subtaskId,
          title,
          note,
          from_status: existing?.status ?? null,
          to_status: dto.status ?? existing?.status ?? null,
          assigned_agent_key: result?.assigned_agent_key ?? null,
          feedback: result?.feedback ?? existing?.feedback ?? null,
        },
      })
    }

    return result
  }
}
