import { randomUUID } from 'crypto'
import { BadRequestException, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PostgresDirectService } from '@vibey/api-shared'
import { SlackApiIntegration } from '../../slack/integrations/slack-api.integration'
import { TelegramApiIntegration } from '../../telegram/integrations/telegram-api.integration'
import type { CreateDeliverableDto, CreateMissionDto, CreateMissionPlanDto } from '../dto'
import { parseAssignTo } from '../dto'
import { MissionInternalRepository } from '../repositories/mission-internal.repository'
import { MissionServiceRoleClientRepository } from '../repositories/mission-service-role-client.repository'
import { MissionsRepository } from '../repositories/missions.repository'
import { MissionLifecycleService } from './mission-lifecycle.service'
import { MissionOutboxService } from './mission-outbox.service'

const HUMAN_SUBTASK_SLA_MS = 48 * 60 * 60 * 1000

export type MissionSubtaskAssignee = ReturnType<typeof parseAssignTo>
export type MissionParsedPlanSubtask = CreateMissionPlanDto['subtasks'][number] & {
  _assignee: MissionSubtaskAssignee
}

export abstract class MissionInternalBase {

  protected readonly telegramApi = new TelegramApiIntegration()
  protected readonly slackApi = new SlackApiIntegration()
  protected readonly metrics = new Logger('HumanSubtaskMetrics')

  constructor(
    protected readonly missionsRepository: MissionsRepository,
    protected readonly postgresDirect: PostgresDirectService,
    protected readonly missionOutboxService: MissionOutboxService,
    protected readonly missionLifecycleService: MissionLifecycleService,
    protected readonly missionInternalRepository: MissionInternalRepository = new MissionInternalRepository(),
    protected readonly serviceRoleClientRepository: MissionServiceRoleClientRepository = new MissionServiceRoleClientRepository(),
  ) {}

  protected useNativeMissionTx(): boolean {
    return this.postgresDirect.hasConnectionString()
  }

  protected getServiceRoleClient(): SupabaseClient {
    return this.serviceRoleClientRepository.getClient()
  }

  async internalCreateMission(body: {
    user_id: string
    org_id?: string | null
    title: string
    brief?: string
    campaign_id?: string
    space_id?: string
    source_space_item_id?: string
    assigned_agent_key?: string
    idempotency_key?: string
    input?: Record<string, unknown>
  }) {
    const supabase = this.getServiceRoleClient()
    const dto: CreateMissionDto = {
      title: body.title,
      brief: body.brief,
      campaign_id: body.campaign_id,
      space_id: body.space_id,
      source_space_item_id: body.source_space_item_id,
      assigned_agent_key: body.assigned_agent_key,
      idempotency_key: body.idempotency_key,
      input: body.input,
    }
    return this.missionLifecycleService.create(supabase, body.user_id, dto, body.org_id)
  }

  async internalCreateDeliverable(dto: CreateDeliverableDto) {
    const supabase = this.getServiceRoleClient()
    await this.missionsRepository.findMissionById(supabase, dto.mission_id, dto.user_id, dto.org_id)
    return this.missionsRepository.createDeliverable(supabase, dto)
  }

  protected async assertHumanAssignee(
    supabase: SupabaseClient,
    orgId: string | null | undefined,
    userId: string,
    missionOwnerId: string,
  ): Promise<void> {
    if (!orgId && userId !== missionOwnerId) {
      throw new BadRequestException(
        `Cannot assign a personal mission subtask to human ${userId}: only the mission owner can be assigned.`,
      )
    }
    if (orgId) {
      const membership = await this.missionInternalRepository.findOrgMemberForAssignment(
        supabase,
        orgId,
        userId,
      )
      if (!membership || membership.status !== 'active') {
        throw new BadRequestException(
          `User ${userId} is not an active member of this org; cannot assign a subtask.`,
        )
      }
    }
    const profile = await this.missionInternalRepository.findProfileAssignmentPreference(
      supabase,
      userId,
    )
    if (!profile) {
      throw new BadRequestException(`Profile missing for user ${userId}; cannot assign a subtask.`)
    }
    if (profile.accepts_agent_assignments === false) {
      throw new BadRequestException(`User ${userId} has turned off agent-assigned work.`)
    }
  }

  protected humanSubtaskSlaAt(): string {
    return new Date(Date.now() + HUMAN_SUBTASK_SLA_MS).toISOString()
  }

  protected resolveSubtaskAssignee(assignTo: string) {
    const parsed = parseAssignTo(assignTo)
    return parsed
  }

  protected createSubtaskIdMap(subtasks: Array<{ id: string }>): Map<string, string> {
    const subtaskIdMap = new Map<string, string>()
    for (const subtask of subtasks) {
      subtaskIdMap.set(subtask.id, randomUUID())
    }
    return subtaskIdMap
  }

  protected buildPlanContent(dto: CreateMissionPlanDto, subtaskIdMap: Map<string, string>) {
    const raw = dto as CreateMissionPlanDto & {
      harness?: Record<string, unknown>
      contextSnapshot?: unknown
      clarificationQuestions?: unknown[]
      assumptions?: unknown[]
      assertions?: unknown[]
      assertionCoverage?: unknown[]
      validatorPlan?: unknown[]
    }
    const harness: Record<string, unknown> =
      raw.harness && typeof raw.harness === 'object' && !Array.isArray(raw.harness)
        ? raw.harness
        : {}
    const pickArray = (camel: string, snake: string, fallback: unknown): unknown[] => {
      const camelValue = harness[camel]
      const snakeValue = harness[snake]
      if (Array.isArray(camelValue) && camelValue.length > 0) return camelValue
      if (Array.isArray(snakeValue) && snakeValue.length > 0) return snakeValue
      if (Array.isArray(fallback)) return fallback
      if (Array.isArray(camelValue)) return camelValue
      if (Array.isArray(snakeValue)) return snakeValue
      return []
    }
    const mapPlannerSubtaskIds = (ids: unknown): string[] => {
      if (!Array.isArray(ids)) return []
      return ids
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map((id) => subtaskIdMap.get(id) ?? id)
    }

    const assertionCoverage = pickArray(
      'assertionCoverage',
      'assertion_coverage',
      raw.assertionCoverage,
    ).map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry
      const row = entry as Record<string, unknown>
      return {
        ...row,
        assertionKey: row.assertionKey ?? row.assertion_key,
        implementedBy: mapPlannerSubtaskIds(row.implementedBy ?? row.implemented_by),
        verifiedBy: Array.isArray(row.verifiedBy)
          ? row.verifiedBy
          : Array.isArray(row.verified_by)
            ? row.verified_by
            : [],
      }
    })

    const subtaskAssertionKeys: Record<string, string[]> = {}
    for (const subtask of dto.subtasks) {
      const keys = Array.isArray(subtask.assertionKeys) ? subtask.assertionKeys : []
      if (keys.length === 0) continue
      const dbId = subtaskIdMap.get(subtask.id) ?? subtask.id
      subtaskAssertionKeys[dbId] = keys
    }

    return {
      title: dto.title,
      summary: dto.summary,
      approach: dto.approach,
      outOfScope: dto.outOfScope || [],
      harness: {
        contextSnapshot:
          harness.contextSnapshot ?? harness.context_snapshot ?? raw.contextSnapshot ?? null,
        clarificationQuestions: pickArray(
          'clarificationQuestions',
          'clarification_questions',
          raw.clarificationQuestions,
        ),
        assumptions: pickArray('assumptions', 'assumptions', raw.assumptions),
        assertions: pickArray('assertions', 'assertions', raw.assertions),
        assertionCoverage,
        validatorPlan: pickArray('validatorPlan', 'validator_plan', raw.validatorPlan),
        subtaskAssertionKeys,
      },
    }
  }


}
