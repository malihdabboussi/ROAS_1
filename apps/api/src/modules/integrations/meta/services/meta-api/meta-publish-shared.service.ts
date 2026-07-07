import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { MetaIntegration } from '../../integrations/meta.integration'
import type { MetaCampaignObjective } from '../../types/meta.types'
import {
  OBJECTIVE_ALLOWED_OPTIMIZATION_GOALS,
  OBJECTIVE_DEFAULT_OPTIMIZATION_GOAL,
} from './meta-api.types'

@Injectable()
export class MetaPublishSharedService {
  private readonly logger = new Logger(MetaPublishSharedService.name)

  constructor(private readonly meta: MetaIntegration) {}

  async resolveInstagramUserId(
    accessToken: string,
    adAccountId: string,
    pageId: string,
    candidate: string | null | undefined,
  ): Promise<string> {
    const adAccountInstagramAccounts = await this.meta.getInstagramAccountsForAdAccount(
      accessToken,
      adAccountId,
    )
    const adAccountInstagramIds = new Set(
      adAccountInstagramAccounts.map((account) => String(account.id).trim()).filter(Boolean),
    )

    const direct = String(candidate ?? '').trim()
    if (direct) {
      if (adAccountInstagramIds.size === 0 || adAccountInstagramIds.has(direct)) return direct
      throw new BadRequestException(
        'Instagram account is not available for this ad account. Select an Instagram account linked to the selected ad account.',
      )
    }

    const adAccountDefault = String(adAccountInstagramAccounts[0]?.id ?? '').trim()
    if (adAccountDefault) return adAccountDefault

    const accounts = await this.meta.getInstagramAccountsForPage(accessToken, pageId)
    if (adAccountInstagramIds.size === 0) {
      return String(accounts[0]?.id ?? '').trim()
    }
    const resolved = String(
      accounts.find((account) => adAccountInstagramIds.has(account.id))?.id ?? '',
    ).trim()
    if (resolved) return resolved

    return ''
  }

  async resolveReusableMetaObjectId(
    accessToken: string,
    candidateId: string | null | undefined,
    entity: 'campaign' | 'ad_set' | 'ad',
    entityId: string,
  ): Promise<string | null> {
    const normalized = String(candidateId ?? '').trim()
    if (!normalized) return null
    try {
      await this.meta.getObjectStatus(accessToken, normalized)
      return normalized
    } catch (error) {
      if (!this.isMissingMetaObjectError(error)) throw error
      this.logger.warn(
        `Meta ${entity} ${normalized} for ${entityId} is stale. Creating a new Meta object.`,
      )
      return null
    }
  }

  normalizeObjective(candidate: string | undefined): MetaCampaignObjective {
    const normalized = String(candidate ?? '').trim()
    if (normalized in OBJECTIVE_DEFAULT_OPTIMIZATION_GOAL) {
      return normalized as MetaCampaignObjective
    }
    return 'OUTCOME_TRAFFIC'
  }

  resolveOptimizationGoal(objective: MetaCampaignObjective, requested: string | undefined): string {
    const allowed = OBJECTIVE_ALLOWED_OPTIMIZATION_GOALS[objective] ?? ['LINK_CLICKS']
    const normalizedRequested = String(requested ?? '').trim()
    if (normalizedRequested && allowed.includes(normalizedRequested)) return normalizedRequested
    return OBJECTIVE_DEFAULT_OPTIMIZATION_GOAL[objective] ?? allowed[0] ?? 'LINK_CLICKS'
  }

  requiresPixelForOptimizationGoal(optimizationGoal: string): boolean {
    return optimizationGoal === 'OFFSITE_CONVERSIONS' || optimizationGoal === 'CONVERSIONS'
  }

  async isPixelOwnedByAdAccount(
    accessToken: string,
    adAccountId: string,
    pixelId: string,
  ): Promise<boolean> {
    const pixels = await this.meta.getPixels(accessToken, adAccountId)
    return pixels.some((pixel) => pixel.id === pixelId)
  }

  async ensurePixelPreflight(
    accessToken: string,
    adAccountId: string,
    optimizationGoal: string,
    pixelId: string | undefined,
  ): Promise<void> {
    const pixel = String(pixelId ?? '').trim()
    const pixelRequired = this.requiresPixelForOptimizationGoal(optimizationGoal)
    if (pixelRequired && !pixel) {
      throw new BadRequestException({
        success: false,
        error:
          'pixel_required: selected optimization goal requires a Meta Pixel. Create/select a pixel in campaign Ads settings.',
        pixel_required: true,
        optimization_goal: optimizationGoal,
      })
    }
    if (!pixel) return
    const pixelExists = await this.isPixelOwnedByAdAccount(accessToken, adAccountId, pixel)
    if (!pixelExists) {
      throw new BadRequestException({
        success: false,
        error:
          'invalid_pixel: selected pixel does not belong to this ad account. Choose a pixel from this ad account.',
        pixel_required: false,
        optimization_goal: optimizationGoal,
      })
    }
  }

  private isMissingMetaObjectError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
    return (
      message.includes('unsupported get request') ||
      message.includes('invalid object id') ||
      message.includes('does not exist') ||
      message.includes('unknown path components') ||
      message.includes('cannot find')
    )
  }
}
