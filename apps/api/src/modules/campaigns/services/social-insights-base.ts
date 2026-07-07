import { Logger } from '@nestjs/common'
import { ComposioService } from '../../composio/services/composio.service'
import { CampaignSocialInsightsRepository } from '../repositories/campaign-social-insights.repository'

export class SocialInsightsBase {
  protected readonly logger = new Logger('SocialInsightsService')

  protected readonly socialInsightsRepo: CampaignSocialInsightsRepository

  constructor(
    protected readonly composio: ComposioService,
    socialInsightsRepo?: CampaignSocialInsightsRepository,
  ) {
    this.socialInsightsRepo = socialInsightsRepo ?? new CampaignSocialInsightsRepository()
  }

  protected toInt(val: unknown): number {
    if (typeof val === 'number') return Math.round(val)
    if (typeof val === 'string') {
      const n = Number(val)
      return Number.isFinite(n) ? Math.round(n) : 0
    }
    return 0
  }

  protected toNullableNumber(val: unknown): number | null {
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const n = Number(val)
      return Number.isFinite(n) ? n : null
    }
    return null
  }
}
