import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { QueryAssetsSchema, UpdateAssetSchema } from '../dto'
import { MediaCanvaHandoffService } from '../services/media-canva-handoff.service'
import { MediaService } from '../services/media.service'

@Controller('media')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MediaAssetsController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly mediaCanvaHandoffService: MediaCanvaHandoffService,
  ) {}

  /**
   * GET /api/media/assets
   * List media assets: org + campaign_id = all org members’ assets for that campaign; otherwise current user’s library
   */
  @Get('assets')
  async listAssets(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string>,
  ) {
    const parsed = QueryAssetsSchema.safeParse(query)
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'Invalid query',
        details: parsed.error.issues,
      })
    }

    return this.mediaService.listAssets(parsed.data, user, scope.orgId)
  }

  /**
   * GET /api/media/assets/resolve-by-url?url=
   * Resolve a chat/markdown image URL to a media asset id (for Space Media slide-out).
   */
  @Get('assets/resolve-by-url')
  async resolveByUrl(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Query('url') url?: string,
  ) {
    if (!url?.trim()) {
      throw new BadRequestException('url is required')
    }
    const assetId = await this.mediaService.resolveAssetIdByUrl(url, user, scope.orgId)
    if (!assetId) {
      throw new BadRequestException('Asset not found for url')
    }
    return { id: assetId }
  }

  /**
   * GET /api/media/assets/:id
   * Get a single asset by ID
   */
  @Get('assets/:id')
  async getAsset(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    const asset = await this.mediaService.getAsset(id, user, scope.orgId)
    if (!asset) {
      throw new BadRequestException('Asset not found')
    }
    return asset
  }

  /**
   * PATCH /api/media/assets/:id
   * Update asset metadata (name, tags, category, description)
   */
  @Patch('assets/:id')
  async updateAsset(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateAssetSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'Invalid request',
        details: parsed.error.issues,
      })
    }

    const updated = await this.mediaService.updateAsset(id, parsed.data, user, scope.orgId)
    if (!updated) {
      throw new BadRequestException('Asset not found or not owned by user')
    }
    return updated
  }

  /**
   * POST /api/media/assets/:id/copy
   * Duplicate an asset into a different campaign
   */
  @Post('assets/:id/copy')
  @HttpCode(HttpStatus.OK)
  async copyAsset(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: { campaign_id?: string },
  ) {
    if (!body.campaign_id) {
      throw new BadRequestException('campaign_id is required')
    }
    const copied = await this.mediaService.copyAssetToCampaign(
      id,
      body.campaign_id,
      user,
      scope.orgId,
    )
    if (!copied) {
      throw new BadRequestException('Asset not found or copy failed')
    }
    return copied
  }

  /**
   * DELETE /api/media/assets/:id
   * Delete a media asset (storage + DB)
   */
  @Delete('assets/:id')
  async deleteAsset(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    const deleted = await this.mediaService.deleteAsset(id, user, scope.orgId)
    if (!deleted) {
      throw new BadRequestException('Asset not found or not owned by user')
    }
    return { success: true }
  }

  /**
   * POST /api/media/assets/:id/refresh-url
   * Refresh the signed URL for an asset (when expired)
   */
  @Post('assets/:id/refresh-url')
  @HttpCode(HttpStatus.OK)
  async refreshUrl(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    const url = await this.mediaService.refreshUrl(id, user, scope.orgId)
    if (!url) {
      throw new BadRequestException('Asset not found')
    }
    return { url }
  }

  /**
   * POST /api/media/assets/:id/canva-handoff
   * Import the image into Canva and return an edit_url
   */
  @Post('assets/:id/canva-handoff')
  @HttpCode(HttpStatus.OK)
  async openInCanva(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    return this.mediaCanvaHandoffService.createHandoff(user, scope, id)
  }
}
