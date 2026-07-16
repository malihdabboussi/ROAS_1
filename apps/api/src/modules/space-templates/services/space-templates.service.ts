import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { AGENCY_CLIENT_WEBINAR_TEMPLATE_SLUG } from '../../missions/lib/webinar-fulfillment-team'
import { WebinarFulfillmentTeamService } from '../../missions/services/webinar-fulfillment-team.service'
import { SpaceAutomationsRepository } from '../../spaces/repositories/space-automations.repository'
import { SpaceAutomationSchedulerService } from '../../spaces/services/space-automation-scheduler.service'
import { SpaceAutomationService } from '../../spaces/services/space-automation.service'
import type { InstantiateTemplateDto } from '../dto'
import { SpaceTemplatesRepository } from '../repositories/space-templates.repository'
import type { SpaceTemplateDetailRow, SpaceTemplateRow } from '../types'

@Injectable()
export class SpaceTemplatesService {
  private readonly logger = new Logger(SpaceTemplatesService.name)

  constructor(
    private readonly templatesRepo: SpaceTemplatesRepository,
    private readonly automationsRepo: SpaceAutomationsRepository,
    private readonly automationService: SpaceAutomationService,
    private readonly schedulerService: SpaceAutomationSchedulerService,
    private readonly webinarFulfillmentTeamService: WebinarFulfillmentTeamService,
  ) {}

  async list(supabase: SupabaseClient): Promise<SpaceTemplateRow[]> {
    return this.templatesRepo.listPublished(supabase)
  }

  async get(supabase: SupabaseClient, slug: string): Promise<SpaceTemplateDetailRow> {
    return this.templatesRepo.getDetailBySlug(supabase, slug)
  }

  async instantiate(
    supabase: SupabaseClient,
    scope: RequestScope,
    slug: string,
    dto: InstantiateTemplateDto,
  ) {
    const userId = scope.userId
    const orgId = scope.orgId
    const result = await this.templatesRepo.instantiate(supabase, {
      slug,
      title: dto.title,
      orgId,
      campaignId: dto.campaign_id,
      visibility: dto.visibility,
      defaultShareLevel: dto.default_share_level,
      includeTasks: dto.include_tasks,
      includeDocs: dto.include_docs,
      includeChannel: dto.include_channel,
      includeAutomations: dto.include_automations,
    })

    const spaceId = String(result.space.id ?? '')
    if (!spaceId) throw new NotFoundException('Template not found')

    for (const automation of result.automations) {
      await this.automationService.syncExternalTriggerForAutomation(
        supabase,
        userId,
        orgId,
        spaceId,
        automation,
      )
      await this.syncScheduleColumns(supabase, spaceId, automation)
    }

    if (slug === AGENCY_CLIENT_WEBINAR_TEMPLATE_SLUG && dto.campaign_id) {
      await this.webinarFulfillmentTeamService
        .ensureTeam(supabase, userId, { orgId, campaignId: dto.campaign_id })
        .catch((e) =>
          this.logger.warn(
            `Webinar team auto-provision failed for campaign ${dto.campaign_id}: ${(e as Error).message}`,
          ),
        )
    }

    return result.space
  }

  private async syncScheduleColumns(
    supabase: SupabaseClient,
    spaceId: string,
    automation: Record<string, unknown>,
  ): Promise<void> {
    const automationId = String(automation.id ?? '')
    if (!automationId) return
    const next = this.schedulerService.computeInitialNextFireAt(automation)
    await this.automationsRepo.updateScheduleFields(supabase, spaceId, automationId, {
      schedule_next_fire_at: next ? next.toISOString() : null,
    })
  }
}
