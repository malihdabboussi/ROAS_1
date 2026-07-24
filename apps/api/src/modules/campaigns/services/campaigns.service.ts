import { createHash, randomUUID } from 'node:crypto'
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainOpsHookService } from '../../brain/services/brain-ops-hook.service'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { LinkExtractionService } from '../../brain/services/link-extraction.service'
import type { MeetingTranscriptEntry } from '../../brain/types/brain.types'
import { FirefliesApiService } from '../../integrations/fireflies/services/fireflies-api.service'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import { ProgramPermissionsService } from '../../programs/services/program-permissions.service'
import { CampaignAccessRepository } from '../repositories/campaign-access.repository'
import { CampaignsRepository } from '../repositories/campaigns.repository'
import { CampaignsServiceBase04 } from './campaigns-service-04.base'

@Injectable()
export class CampaignsService extends CampaignsServiceBase04 {
  constructor(
    campaignsRepo: CampaignsRepository,
    embeddingService: EmbeddingService,
    linkExtraction: LinkExtractionService,
    firefliesApi: FirefliesApiService,
    @Optional() @Inject(MissionAgentGatewayService) agentGateway?: MissionAgentGatewayService,
    @Optional() brainOpsHook?: BrainOpsHookService,
    @Optional() campaignAccessRepo?: CampaignAccessRepository,
    @Optional() programPermissions?: ProgramPermissionsService,
  ) {
    super(
      campaignsRepo,
      embeddingService,
      linkExtraction,
      firefliesApi,
      agentGateway,
      brainOpsHook,
      campaignAccessRepo,
      programPermissions,
    )
  }
}
