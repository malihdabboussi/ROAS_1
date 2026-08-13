import { randomUUID } from 'crypto'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PostgresDirectService, type OrgRole } from '@vibey/api-shared'
import { SpacePermissionsService } from '../../spaces/services/space-permissions.service'
import type { CreateMissionDto } from '../dto'
import { MissionsRepository } from '../repositories/missions.repository'
import { priorityToRank } from '../types/missions.types'
import { MissionLifecycleNativeTxService } from './mission-lifecycle-native-tx.service'
import { MissionOutboxService } from './mission-outbox.service'

@Injectable()
export class MissionCreateCoordinatorService {
  private readonly logger = new Logger(MissionCreateCoordinatorService.name)

  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly postgresDirect: PostgresDirectService,
    private readonly missionOutboxService: MissionOutboxService,
    private readonly spacePermissions: SpacePermissionsService,
    private readonly nativeTxService: MissionLifecycleNativeTxService,
  ) {}

  private async assertCampaignEditAccess(userId: string, campaignId: string): Promise<void> {
    const result = await this.postgresDirect.query<{ has_edit: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM public.campaigns c
        JOIN public.org_members om ON om.org_id = c.org_id
        LEFT JOIN public.org_campaign_permissions ocp
          ON ocp.org_member_id = om.id AND ocp.campaign_id = c.id
        WHERE c.id = $2::uuid
          AND c.org_id IS NOT NULL
          AND om.user_id = $1::uuid
          AND om.status = 'active'
          AND (ocp.permission = 'edit' OR om.role IN ('owner', 'admin', 'creator'))
      ) AS has_edit`,
      [userId, campaignId],
    )
    if (!result.rows[0]?.has_edit) {
      throw new ForbiddenException('Editor access required to create missions for this campaign')
    }
  }

  async create(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateMissionDto,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    const idempotencyKey = dto.idempotency_key || `mission-${randomUUID()}`
    let missionOwnerId = userId
    let resolvedCampaignId = dto.campaign_id || null
    let missionVisibility: 'private' | 'space' = 'private'

    if (dto.space_id) {
      await this.spacePermissions.assertCanAccessSpace(
        supabase,
        userId,
        orgRole,
        dto.space_id,
        'edit',
        orgId,
      )
      const space = await this.missionsRepository.findMissionSpaceForCreate(supabase, dto.space_id)
      if (!space) throw new Error('Space not found')
      const spaceCampaignId =
        typeof (space as Record<string, unknown>).campaign_id === 'string'
          ? String((space as Record<string, unknown>).campaign_id)
          : null
      if (resolvedCampaignId && spaceCampaignId && resolvedCampaignId !== spaceCampaignId) {
        throw new Error('Mission space does not belong to the selected campaign')
      }
      resolvedCampaignId = resolvedCampaignId ?? spaceCampaignId
      missionVisibility = 'space'
    }

    if (resolvedCampaignId && !dto.space_id) {
      const campaign = await this.missionsRepository.findCampaignOwnerForCreate(
        supabase,
        resolvedCampaignId,
      )
      if (!campaign?.user_id) throw new Error('Campaign not found')
      missionOwnerId = String(campaign.user_id)
      if (missionOwnerId !== userId) {
        await this.assertCampaignEditAccess(userId, resolvedCampaignId)
      }
    }

    if (this.nativeTxService.isEnabled()) {
      return this.nativeTxService.createTransactional(
        missionOwnerId,
        { ...dto, campaign_id: resolvedCampaignId ?? undefined },
        idempotencyKey,
        orgId,
        missionVisibility,
      )
    }

    const existing = await this.missionsRepository.findMissionByIdempotencyKey(
      supabase,
      missionOwnerId,
      idempotencyKey,
      orgId,
    )
    if (existing) return existing

    const correlationId = randomUUID()
    const mission = await this.missionsRepository.createMission(supabase, {
      user_id: missionOwnerId,
      org_id: orgId ?? null,
      parent_mission_id: dto.parent_mission_id || null,
      campaign_id: resolvedCampaignId,
      space_id: dto.space_id || null,
      source_space_item_id: dto.source_space_item_id || null,
      mission_visibility: missionVisibility,
      title: dto.title,
      brief: dto.brief || null,
      description: dto.description || null,
      status: 'inbox',
      priority: dto.priority || 'medium',
      assigned_agent_key:
        dto.assigned_agent_key ||
        (await this.missionsRepository.findPrimaryManagerKey(supabase, missionOwnerId, orgId)),
      current_agent_key: null,
      correlation_id: correlationId,
      idempotency_key: idempotencyKey,
      retry_count: 0,
      input: dto.input || {},
      scheduled_at: dto.scheduled_at ?? null,
    })
    const queuePayload = {
      mission_id: mission.id,
      user_id: missionOwnerId,
      correlation_id: mission.correlation_id,
      assigned_agent_key: mission.assigned_agent_key,
      title: mission.title,
      brief: mission.brief,
      input: mission.input,
    }

    await this.missionOutboxService.enqueueOutboxEvent(supabase, {
      missionId: mission.id,
      userId: missionOwnerId,
      orgId,
      eventType: 'mission.plan.requested',
      dedupeKey: `mission:${mission.id}:plan:create:${idempotencyKey}`,
      priorityRank: priorityToRank(dto.priority),
      payload: {
        requested_by: 'create',
        idempotency_key: idempotencyKey,
        ...(dto.scheduled_at ? { scheduled_at: dto.scheduled_at } : {}),
        ...(dto.space_id ? { space_id: dto.space_id } : {}),
      },
    })

    void Promise.allSettled([
      this.missionsRepository.insertMissionLog(supabase, {
        mission_id: mission.id,
        user_id: missionOwnerId,
        org_id: orgId ?? null,
        event_type: 'mission.created',
        to_status: 'inbox',
        agent_key: mission.assigned_agent_key,
        correlation_id: mission.correlation_id,
        payload: { queue_trigger: queuePayload, requested_by_user_id: userId },
      }),
      this.missionsRepository.touchProfileLastInteraction(
        supabase,
        missionOwnerId,
        new Date().toISOString(),
      ),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.warn(
            `Noncritical mission create audit write failed for ${mission.id}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
          )
        }
      }
    })

    return { ...mission, queue_trigger: queuePayload, requested_by_user_id: userId }
  }
}
