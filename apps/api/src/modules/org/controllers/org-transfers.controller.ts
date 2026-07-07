import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  ZodValidationPipe,
} from '@vibey/api-shared'
import { TransferService } from '../../transfer/services/transfer.service'
import {
  OrgIdParamSchema,
  TransferCampaignSchema,
  TransferPreviewSchema,
  type OrgIdParam,
  type TransferCampaignInput,
  type TransferPreviewInput,
} from '../dto'

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgTransfersController {
  constructor(private readonly transferService: TransferService) {}

  @Post(':orgId/campaigns/transfer/preview')
  @RequireOrgRole('admin')
  @HttpCode(HttpStatus.OK)
  async transferPreview(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(TransferPreviewSchema)) dto: TransferPreviewInput,
    @CurrentUser() user: { id: string },
  ) {
    const preview = await this.transferService.previewCampaign(
      dto.campaign_id,
      user.id,
      { org_id: params.orgId },
      'move',
    )
    return { success: true, preview }
  }

  @Post(':orgId/campaigns/transfer')
  @RequireOrgRole('admin')
  @HttpCode(HttpStatus.OK)
  async transferCampaigns(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(TransferCampaignSchema)) dto: TransferCampaignInput,
    @CurrentUser() user: { id: string },
  ) {
    const results: Awaited<ReturnType<typeof this.transferService.executeCampaignTransfer>>[] = []
    for (const campaignId of dto.campaign_ids) {
      const result = await this.transferService.executeCampaignTransfer(
        campaignId,
        user.id,
        { org_id: params.orgId },
        dto.mode,
        {
          include_domains: dto.move_domains,
          include_email_domains: dto.move_email_domains,
          include_contacts: dto.include_contacts,
        },
      )
      results.push(result)
    }
    return { success: true, results }
  }
}
