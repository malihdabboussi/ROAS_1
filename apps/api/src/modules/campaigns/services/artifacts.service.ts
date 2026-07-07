/**
 * Artifacts Service
 *
 * Injectable facade for campaign artifact operations. Implementation is split
 * across focused base classes in this folder to keep each domain file small.
 */
import { Injectable, Optional } from '@nestjs/common'
import { VercelIntegration } from '../../domains/integrations/vercel.integration'
import { MetaApiService } from '../../integrations/meta/services/meta-api.service'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import { SpaceAutomationService } from '../../spaces/services/space-automation.service'
import { CampaignArtifactAdsRepository } from '../repositories/campaign-artifact-ads.repository'
import { CampaignArtifactContentRepository } from '../repositories/campaign-artifact-content.repository'
import { CampaignArtifactDocumentsRepository } from '../repositories/campaign-artifact-documents.repository'
import { CampaignArtifactMoveRepository } from '../repositories/campaign-artifact-move.repository'
import { CampaignArtifactOffersRepository } from '../repositories/campaign-artifact-offers.repository'
import { CampaignArtifactPresentationsRepository } from '../repositories/campaign-artifact-presentations.repository'
import { CampaignArtifactSequencesRepository } from '../repositories/campaign-artifact-sequences.repository'
import { ArtifactsContentBase } from './artifacts-content.base'

@Injectable()
export class ArtifactsService extends ArtifactsContentBase {
  constructor(
    metaApiService: MetaApiService,
    vercelIntegration: VercelIntegration,
    spaceRetrievalIndex: SpaceRetrievalIndexService,
    @Optional() spaceAutomation?: SpaceAutomationService,
    @Optional() artifactPresentationsRepo?: CampaignArtifactPresentationsRepository,
    @Optional() artifactDocumentsRepo?: CampaignArtifactDocumentsRepository,
    @Optional() artifactContentRepo?: CampaignArtifactContentRepository,
    @Optional() artifactSequencesRepo?: CampaignArtifactSequencesRepository,
    @Optional() artifactAdsRepo?: CampaignArtifactAdsRepository,
    @Optional() artifactMoveRepo?: CampaignArtifactMoveRepository,
    @Optional() artifactOffersRepo?: CampaignArtifactOffersRepository,
  ) {
    super(
      metaApiService,
      vercelIntegration,
      spaceRetrievalIndex,
      spaceAutomation,
      artifactPresentationsRepo,
      artifactDocumentsRepo,
      artifactContentRepo,
      artifactSequencesRepo,
      artifactAdsRepo,
      artifactMoveRepo,
      artifactOffersRepo,
    )
  }
}
