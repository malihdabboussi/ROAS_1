import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleDriveApiService } from '../../google-drive/services/google-drive-api.service'
import { MetaIntegration } from '../integrations/meta.integration'
import { MetaInsightsRepository } from '../repositories/meta-insights.repository'
import { MetaPublishRepository } from '../repositories/meta-publish.repository'
import { MetaSyncRepository } from '../repositories/meta-sync.repository'
import type {
  MetaAdSetUpdateInput,
  MetaBatchPublishResult,
  MetaCampaignUpdateInput,
  MetaFetchedAd,
  MetaFetchedAdSet,
  MetaFetchedCampaign,
  MetaFetchedCreative,
  MetaFetchedHierarchy,
  MetaPublishAdInput,
  MetaPublishCampaignInput,
} from '../types/meta.types'
import { MetaAccountsService } from './meta-api/meta-accounts.service'
import type { InsightsLevel, MetaInsightsRow, MetaInsightsSummary } from './meta-api/meta-api.types'
import { MetaBudgetService } from './meta-api/meta-budget.service'
import { MetaFetchService } from './meta-api/meta-fetch.service'
import { MetaInsightsService } from './meta-api/meta-insights.service'
import { MetaPublishBatchPersistenceService } from './meta-api/meta-publish-batch-persistence.service'
import { MetaPublishBatchService } from './meta-api/meta-publish-batch.service'
import { MetaPublishMediaService } from './meta-api/meta-publish-media.service'
import { MetaPublishSharedService } from './meta-api/meta-publish-shared.service'
import { MetaPublishSingleService } from './meta-api/meta-publish-single.service'
import { MetaStatusService } from './meta-api/meta-status.service'
import type { SyncResult } from './meta-api/meta-sync.service'
import { MetaSyncService } from './meta-api/meta-sync.service'
import { MetaUpdateService } from './meta-api/meta-update.service'
import { MetaOAuthService } from './meta-oauth.service'

@Injectable()
export class MetaApiService {
  private readonly accounts: MetaAccountsService
  private readonly insights: MetaInsightsService
  private readonly budget: MetaBudgetService
  private readonly publishSingle: MetaPublishSingleService
  private readonly publishBatch: MetaPublishBatchService
  private readonly status: MetaStatusService
  private readonly update: MetaUpdateService
  private readonly fetcher: MetaFetchService
  private readonly sync: MetaSyncService

  constructor(
    meta: MetaIntegration,
    oauth: MetaOAuthService,
    accounts?: MetaAccountsService,
    insights?: MetaInsightsService,
    budget?: MetaBudgetService,
    publishSingle?: MetaPublishSingleService,
    publishBatch?: MetaPublishBatchService,
    status?: MetaStatusService,
    shared?: MetaPublishSharedService,
    update?: MetaUpdateService,
    driveApi?: GoogleDriveApiService,
    fetcher?: MetaFetchService,
    syncService?: MetaSyncService,
  ) {
    const sharedService = shared ?? new MetaPublishSharedService(meta)
    const publishMediaService = publishSingle
      ? undefined
      : new MetaPublishMediaService(meta, driveApi!)
    const batchPublishRepository = new MetaPublishRepository()
    const publishBatchPersistenceService = publishBatch
      ? undefined
      : new MetaPublishBatchPersistenceService(batchPublishRepository)
    this.accounts = accounts ?? new MetaAccountsService(meta, oauth)
    this.insights = insights ?? new MetaInsightsService(meta, oauth, new MetaInsightsRepository())
    this.budget = budget ?? new MetaBudgetService(meta, oauth, new MetaPublishRepository())
    this.publishSingle =
      publishSingle ??
      new MetaPublishSingleService(
        meta,
        oauth,
        sharedService,
        publishMediaService!,
        new MetaPublishRepository(),
      )
    this.publishBatch =
      publishBatch ??
      new MetaPublishBatchService(
        meta,
        oauth,
        sharedService,
        driveApi!,
        publishBatchPersistenceService!,
        batchPublishRepository,
      )
    this.status = status ?? new MetaStatusService(meta, oauth)
    this.update = update ?? new MetaUpdateService(meta, oauth, new MetaPublishRepository())
    this.fetcher = fetcher ?? new MetaFetchService(meta, oauth)
    this.sync =
      syncService ?? new MetaSyncService(meta, oauth, sharedService, new MetaSyncRepository())
  }

  async getAdAccounts(supabase: SupabaseClient, userId: string) {
    return this.accounts.getAdAccounts(supabase, userId)
  }

  async getPages(supabase: SupabaseClient, userId: string) {
    return this.accounts.getPages(supabase, userId)
  }

  async getPageInfo(supabase: SupabaseClient, userId: string, pageId: string) {
    return this.accounts.getPageInfo(supabase, userId, pageId)
  }

  async getPixels(supabase: SupabaseClient, userId: string, adAccountId: string) {
    return this.accounts.getPixels(supabase, userId, adAccountId)
  }

  async getAdImages(supabase: SupabaseClient, userId: string, adAccountId: string) {
    return this.accounts.getAdImages(supabase, userId, adAccountId)
  }

  async createPixel(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
    input: { name: string; description?: string; data_use_setting?: string },
  ) {
    return this.accounts.createPixel(supabase, userId, adAccountId, input)
  }

  async getCustomAudiences(supabase: SupabaseClient, userId: string, adAccountId: string) {
    return this.accounts.getCustomAudiences(supabase, userId, adAccountId)
  }

  async createCustomAudience(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
    input: { name: string; rule?: Record<string, unknown>; retention_days?: number },
  ) {
    return this.accounts.createCustomAudience(supabase, userId, adAccountId, input)
  }

  async createLookalikeAudience(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
    input: { name: string; origin_audience_id: string; country: string; ratio?: number },
  ) {
    return this.accounts.createLookalikeAudience(supabase, userId, adAccountId, input)
  }

  async getCustomConversions(supabase: SupabaseClient, userId: string, adAccountId: string) {
    return this.accounts.getCustomConversions(supabase, userId, adAccountId)
  }

  async createCustomConversion(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
    input: { name: string; event_source_id: string; custom_event_type: string; rule?: string },
  ) {
    return this.accounts.createCustomConversion(supabase, userId, adAccountId, input)
  }

  async getInstagramAccountsForPage(supabase: SupabaseClient, userId: string, pageId: string) {
    return this.accounts.getInstagramAccountsForPage(supabase, userId, pageId)
  }

  async getInsights(
    supabase: SupabaseClient,
    userId: string,
    input: {
      campaignId: string
      level: InsightsLevel
      orgId?: string
      adCampaignId?: string
      adSetId?: string
      startDate?: string
      endDate?: string
    },
  ): Promise<{ level: InsightsLevel; summary: MetaInsightsSummary; rows: MetaInsightsRow[] }> {
    return this.insights.getInsights(supabase, userId, input)
  }

  async updateCampaignBudget(
    supabase: SupabaseClient,
    userId: string,
    adCampaignId: string,
    input: { daily_budget?: number; lifetime_budget?: number },
  ) {
    return this.budget.updateCampaignBudget(supabase, userId, adCampaignId, input)
  }

  async updateAdSetBudget(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
    input: { daily_budget?: number; lifetime_budget?: number },
  ) {
    return this.budget.updateAdSetBudget(supabase, userId, adSetId, input)
  }

  async updateCampaignOnMeta(
    supabase: SupabaseClient,
    userId: string,
    adCampaignId: string,
    input: MetaCampaignUpdateInput,
  ) {
    return this.update.updateCampaignOnMeta(supabase, userId, adCampaignId, input)
  }

  async updateAdSetOnMeta(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
    input: MetaAdSetUpdateInput,
  ) {
    return this.update.updateAdSetOnMeta(supabase, userId, adSetId, input)
  }

  async publishAd(
    supabase: SupabaseClient,
    userId: string,
    input: MetaPublishAdInput,
  ): Promise<{
    meta_campaign_id: string
    meta_ad_set_id: string
    meta_creative_id: string
    meta_ad_id: string
  }> {
    return this.publishSingle.publishAd(supabase, userId, input)
  }

  async publishCampaignBatch(
    supabase: SupabaseClient,
    userId: string,
    input: MetaPublishCampaignInput,
  ): Promise<MetaBatchPublishResult> {
    return this.publishBatch.publishCampaignBatch(supabase, userId, input)
  }

  async getAdStatus(supabase: SupabaseClient, userId: string, metaAdId: string) {
    return this.status.getAdStatus(supabase, userId, metaAdId)
  }

  async searchCountries(supabase: SupabaseClient, userId: string, query: string) {
    return this.accounts.searchCountries(supabase, userId, query)
  }

  async searchLocations(supabase: SupabaseClient, userId: string, query: string) {
    return this.accounts.searchLocations(supabase, userId, query)
  }

  async searchInterests(supabase: SupabaseClient, userId: string, query: string) {
    return this.accounts.searchInterests(supabase, userId, query)
  }

  async getDeliveryEstimate(supabase: SupabaseClient, userId: string, adSetId: string) {
    return this.accounts.getDeliveryEstimate(supabase, userId, adSetId)
  }

  async setAdMetaStatus(
    supabase: SupabaseClient,
    userId: string,
    adId: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    return this.status.setAdMetaStatus(supabase, userId, adId, status)
  }

  async setAdSetMetaStatus(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    return this.status.setAdSetMetaStatus(supabase, userId, adSetId, status)
  }

  async setAdCampaignMetaStatus(
    supabase: SupabaseClient,
    userId: string,
    adCampaignId: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    return this.status.setAdCampaignMetaStatus(supabase, userId, adCampaignId, status)
  }

  async handleAdRuleWebhook(
    supabaseOrPayload: SupabaseClient | Record<string, unknown>,
    payload?: Record<string, unknown>,
  ): Promise<{ processed: number }> {
    return payload
      ? this.status.handleAdRuleWebhook(supabaseOrPayload as SupabaseClient, payload)
      : this.status.handleAdRuleWebhook(supabaseOrPayload as Record<string, unknown>)
  }

  async refreshAdCampaignStatus(supabase: SupabaseClient, userId: string, adCampaignId: string) {
    return this.status.refreshAdCampaignStatus(supabase, userId, adCampaignId)
  }

  async refreshAdSetStatus(supabase: SupabaseClient, userId: string, adSetId: string) {
    return this.status.refreshAdSetStatus(supabase, userId, adSetId)
  }

  async refreshAdHierarchyStatus(supabase: SupabaseClient, userId: string, adId: string) {
    return this.status.refreshAdHierarchyStatus(supabase, userId, adId)
  }

  // ---------------------------------------------------------------------------
  // Fetch existing entities from Meta (browse)
  // ---------------------------------------------------------------------------

  async listMetaCampaigns(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
  ): Promise<MetaFetchedCampaign[]> {
    return this.fetcher.listCampaigns(supabase, userId, adAccountId)
  }

  async listMetaAdSets(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<MetaFetchedAdSet[]> {
    return this.fetcher.listAdSets(supabase, userId, campaignId)
  }

  async listMetaAds(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
  ): Promise<MetaFetchedAd[]> {
    return this.fetcher.listAds(supabase, userId, adSetId)
  }

  async getMetaAdCreative(
    supabase: SupabaseClient,
    userId: string,
    creativeId: string,
  ): Promise<MetaFetchedCreative | null> {
    return this.fetcher.getAdCreative(supabase, userId, creativeId)
  }

  async getMetaFullHierarchy(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
  ): Promise<MetaFetchedHierarchy> {
    return this.fetcher.getFullHierarchy(supabase, userId, adAccountId)
  }

  // ---------------------------------------------------------------------------
  // Sync (reconcile Meta → Vibey)
  // ---------------------------------------------------------------------------

  async syncMetaAdAccount(
    supabase: SupabaseClient,
    userId: string,
    vibeyStoreCampaignId: string,
    adAccountId: string,
  ): Promise<SyncResult> {
    return this.sync.syncAdAccount(supabase, userId, vibeyStoreCampaignId, adAccountId)
  }
}
