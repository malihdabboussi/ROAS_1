import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { CreditsService } from '../../billing/services/credits.service'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { MediaService } from '../../media/services/media.service'

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalMediaBillingController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly creditsService: CreditsService,
  ) {}

  /**
   * POST /api/internal/media/generate
   * Generate an AI image on behalf of a user.
   */
  @Post('media/generate')
  @HttpCode(HttpStatus.OK)
  async generateImage(
    @Body()
    body: {
      prompt: string
      aspect_ratio?: string
      campaign_id?: string
      category?: string
      tags?: string[]
      _user_id: string
      _org_id?: string
    },
  ) {
    if (!body.prompt || !body._user_id) {
      throw new BadRequestException('prompt and _user_id are required')
    }

    const owner = await this.creditsService.resolveCreditsOwner(body._user_id, body._org_id)
    const balance =
      owner.billingType === 'org' && owner.orgId
        ? await this.creditsService.getOrgBalance(owner.orgId)
        : await this.creditsService.getBalance(owner.creditsOwnerId)
    if (balance.totalAvailable <= 0) {
      throw new BadRequestException('credits_exhausted')
    }

    return this.mediaService.generateImage(
      {
        prompt: body.prompt,
        aspect_ratio: (body.aspect_ratio as '1:1' | '16:9' | '9:16' | '3:2' | '4:3') ?? '16:9',
        campaign_id: body.campaign_id,
        category: body.category,
        tags: body.tags,
      },
      { id: body._user_id },
      body._org_id ?? null,
    )
  }

  /**
   * POST /api/internal/billing/auto-recharge
   * Trigger auto-recharge check and charge for a user or org.
   */
  @Post('billing/auto-recharge')
  @HttpCode(HttpStatus.OK)
  async triggerAutoRecharge(@Body() body: { user_id?: string; org_id?: string }) {
    if (body.org_id) {
      const balance = await this.creditsService.triggerAutoRechargeForOrg(body.org_id)
      return { success: true, balance }
    }

    if (body.user_id) {
      const balance = await this.creditsService.triggerAutoRechargeForUser(body.user_id)
      return { success: true, balance }
    }

    throw new BadRequestException('user_id or org_id is required')
  }

  /**
   * POST /api/internal/billing/direct-text-usage
   * Charge direct provider token usage from workers that cannot inject CreditsService.
   */
  @Post('billing/direct-text-usage')
  @HttpCode(HttpStatus.OK)
  async chargeDirectTextUsage(
    @Body()
    body: {
      _user_id: string
      _org_id?: string | null
      campaign_id?: string | null
      conversation_id?: string | null
      feature: string
      action?: string
      model_name: string
      usage: {
        input?: number
        output?: number
        cacheRead?: number
        cacheWrite?: number
        totalTokens?: number
      }
      cost_source?: string
      metadata?: Record<string, unknown>
    },
  ) {
    if (!body._user_id || !body.feature || !body.model_name) {
      throw new BadRequestException('_user_id, feature, and model_name are required')
    }
    const totalTokens = Number(body.usage?.totalTokens ?? 0)
    if (!Number.isFinite(totalTokens) || totalTokens <= 0) {
      throw new BadRequestException('usage.totalTokens must be positive')
    }

    const result = await this.creditsService.processDirectTextUsage({
      userId: body._user_id,
      orgId: body._org_id ?? undefined,
      campaignId: body.campaign_id ?? undefined,
      conversationId: body.conversation_id ?? undefined,
      feature: body.feature,
      action: body.action,
      modelName: body.model_name,
      usage: {
        input: Number(body.usage.input ?? 0),
        output: Number(body.usage.output ?? 0),
        cacheRead: Number(body.usage.cacheRead ?? 0),
        cacheWrite: Number(body.usage.cacheWrite ?? 0),
        totalTokens,
      },
      costSource: body.cost_source,
      metadata: body.metadata,
    })
    return { success: true, result }
  }
}
