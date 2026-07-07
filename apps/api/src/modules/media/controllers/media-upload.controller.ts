import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import {
  ConfirmUploadSchema,
  ImportUrlSchema,
  PresignUploadSchema,
  type MediaDirectUploadOpts,
} from '../dto'
import { MediaService } from '../services/media.service'

@Controller('media')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MediaUploadController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * POST /api/media/upload
   * Upload a user file to the media library
   */
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadFile(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: MediaDirectUploadOpts,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided')
    }
    return this.mediaService.uploadFile(
      file.buffer,
      file.mimetype,
      file.originalname,
      user,
      scope.orgId,
      {
        category: body.category,
        name: body.name,
        campaign_id: body.campaign_id,
        space_id: body.space_id,
      },
    )
  }

  @Post('import-url')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async importFromUrl(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const parsed = ImportUrlSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException({ error: 'Invalid request', details: parsed.error.issues })
    }

    const result = await this.mediaService.importFromUrl(parsed.data, user, scope.orgId)
    if (!result.success) {
      throw new BadRequestException(result.error ?? 'Could not import that URL')
    }
    return result
  }

  @Post('campaigns/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadCampaignAsset(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { campaign_id?: string; folder?: string },
  ) {
    if (!file) throw new BadRequestException('No file provided')
    if (!body.campaign_id) throw new BadRequestException('campaign_id is required')
    const result = await this.mediaService.uploadCampaignAsset(
      file.buffer,
      file.mimetype,
      user.id,
      body.campaign_id,
      file.originalname,
      body.folder ?? 'uploads',
      scope.orgId,
    )
    return {
      url: result.signedUrl,
      path: result.path,
      asset_id: result.assetId,
      asset: result.asset,
      asset_ref: result.asset_ref,
    }
  }

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  async presignUpload(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const parsed = PresignUploadSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException({ error: 'Invalid request', details: parsed.error.issues })
    }
    const result = await this.mediaService.createPresignedUpload(parsed.data, user, scope.orgId)
    if (!result.success) throw new BadRequestException(result.error ?? 'Presign failed')
    return result
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmUpload(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const parsed = ConfirmUploadSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException({ error: 'Invalid request', details: parsed.error.issues })
    }
    const result = await this.mediaService.confirmPresignedUpload(parsed.data, user, scope.orgId)
    if (!result.success) throw new BadRequestException(result.error ?? 'Confirm failed')
    return result
  }
}
