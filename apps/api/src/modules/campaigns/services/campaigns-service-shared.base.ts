import { Logger } from '@nestjs/common'
import { BrainOpsHookService } from '../../brain/services/brain-ops-hook.service'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { LinkExtractionService } from '../../brain/services/link-extraction.service'
import { FirefliesApiService } from '../../integrations/fireflies/services/fireflies-api.service'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import { CampaignAccessRepository } from '../repositories/campaign-access.repository'
import { CampaignsRepository } from '../repositories/campaigns.repository'

export abstract class CampaignsServiceSharedBase {
  // Abstract declarations for methods implemented by later base classes.
  abstract updateCampaignContext(...args: any[]): any
  abstract generateCampaignStrategyContext(...args: any[]): any
  abstract deleteCampaign(...args: any[]): any
  abstract restoreCampaign(...args: any[]): any
  abstract ensureGeneralCampaign(...args: any[]): any
  abstract ensurePersonalCampaign(...args: any[]): any
  abstract getCampaignAnalytics(...args: any[]): any
  abstract getCampaignEmailAnalytics(...args: any[]): any
  abstract getCampaignAdAnalytics(...args: any[]): any
  abstract getCampaignReportingWidgets(...args: any[]): any
  abstract getCampaignLeaderboard(...args: any[]): any
  abstract listKnowledgeNodes(...args: any[]): any
  abstract createManualKnowledgeNode(...args: any[]): any
  abstract importKnowledgeFromUrl(...args: any[]): any
  protected abstract tryAgentTranscript(...args: any[]): any
  abstract ingestKnowledgeFromDeliverable(...args: any[]): any
  abstract deleteKnowledgeNode(...args: any[]): any
  abstract getKnowledgeGraph(...args: any[]): any
  abstract searchKnowledge(...args: any[]): any
  abstract syncKnowledgeFromAssets(...args: any[]): any
  abstract organizeKnowledgeGraph(...args: any[]): any
  protected abstract upsertAssetNode(...args: any[]): any
  protected abstract ingestKnowledgePayload(...args: any[]): any
  protected abstract resolveOrCreateCampaignBrain(...args: any[]): any
  protected abstract resolveKnowledgeEmbedding(...args: any[]): any
  protected abstract autoConnectNode(...args: any[]): any
  protected abstract decodeHtmlEntities(...args: any[]): any
  protected abstract extractTitleFromHtml(...args: any[]): any
  protected abstract extractTextFromHtml(...args: any[]): any
  protected abstract normalizeKnowledgeText(...args: any[]): any
  protected abstract hashKnowledgeText(...args: any[]): any
  protected abstract splitIntoChunks(...args: any[]): any
  protected abstract isLikelyNoiseChunk(...args: any[]): any
  protected abstract isGeneralCampaign(...args: any[]): any
  protected abstract isPersonalCampaign(...args: any[]): any
  protected abstract isProtectedSystemCampaign(...args: any[]): any
  protected abstract isExcludedFromTeamCampaignAssignments(...args: any[]): any
  protected abstract resolveDomain(...args: any[]): any
  protected abstract classifyDomain(...args: any[]): any
  protected abstract buildMeetingKnowledgeContent(...args: any[]): any
  // End generated abstract declarations.

  protected readonly logger = new Logger('CampaignsService')
  protected static readonly KNOWLEDGE_SEARCH_THRESHOLD = 0.58
  protected static readonly DUPLICATE_SIMILARITY_THRESHOLD = 0.9
  protected static readonly PARTIAL_SIMILARITY_THRESHOLD = 0.82
  protected static readonly PARTIAL_IMPORT_OVERLAP_THRESHOLD = 0.5
  protected static readonly NEAR_FULL_IMPORT_OVERLAP_THRESHOLD = 0.85
  protected static readonly MIN_CHUNK_CHARS = 120
  protected static readonly CHUNK_SIZE_CHARS = 1800
  protected static readonly CHUNK_OVERLAP_CHARS = 300
  protected static readonly GENERAL_SYSTEM_KIND = 'general'
  protected static readonly PERSONAL_SYSTEM_KIND = 'personal'
  /** Always assigned to every campaign when present in `agents_registry` (cannot be unassigned via API). */
  protected static readonly CAMPAIGN_CORE_AGENT_KEYS = ['vibey', 'atlas'] as const

  protected readonly NODE_TYPE_DOMAIN_MAP: Record<
    string,
    'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
  > = {
    offer: 'marketing',
    avatar: 'marketing',
    theme: 'creative',
    deliverable: 'general',
  }

  protected static readonly VALID_DOMAINS = [
    'strategy',
    'marketing',
    'finance',
    'operations',
    'creative',
    'general',
  ] as const

  constructor(
    protected readonly campaignsRepo: CampaignsRepository,
    protected readonly embeddingService: EmbeddingService,
    protected readonly linkExtraction: LinkExtractionService,
    protected readonly firefliesApi: FirefliesApiService,
    protected readonly agentGateway?: MissionAgentGatewayService,
    protected readonly brainOpsHook?: BrainOpsHookService,
    protected readonly campaignAccessRepo: CampaignAccessRepository = new CampaignAccessRepository(),
  ) {}
}
