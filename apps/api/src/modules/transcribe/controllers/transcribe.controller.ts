import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
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
  type AssetRef,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { CreditsService } from '../../billing/services/credits.service'
import { StreamUsageSchema } from '../dto'
import { TranscribeService } from '../services/transcribe.service'

@Controller('transcribe')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class TranscribeController {
  private readonly logger = new Logger(TranscribeController.name)

  constructor(
    private readonly transcribeService: TranscribeService,
    private readonly creditsService: CreditsService,
  ) {}

  @Post('file')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('audio'))
  async transcribeFile(
    @CurrentUser() user: { id: string; email: string },
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined,
    @OrgContext() _scope: RequestScope,
    @Body()
    body?: {
      asset_ref?: AssetRef
      assetRef?: AssetRef
      fileUrl?: string
      filename?: string
      mimeType?: string
    },
  ) {
    this.logger.log(`POST /transcribe/file - User: ${user.id}`)

    const audioFile = file ?? (await this.resolveAssetBackedAudioFile(body))

    if (!audioFile) {
      throw new BadRequestException('No audio file provided')
    }

    const result = await this.transcribeService.transcribeFile(audioFile, user)

    if (result.success) {
      const durationEstimateSec = Math.max(1, Math.round(audioFile.size / 16000))
      const estimatedTokens = durationEstimateSec * 25 + (result.text?.length ?? 0)
      try {
        await this.creditsService.processDirectTextUsage({
          userId: user.id,
          orgId: _scope.orgId ?? undefined,
          feature: 'transcribe',
          action: 'file',
          modelName: 'deepgram/nova-3',
          usage: {
            input: durationEstimateSec * 25,
            output: result.text?.length ?? 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: estimatedTokens,
          },
          costSource: 'deepgram_estimate',
        })
      } catch (err) {
        this.logger.warn(
          `credit_deduction_failed feature=transcribe action=file userId=${user.id} estimatedTokens=${estimatedTokens} err=${err instanceof Error ? err.message : String(err)}`,
        )
        throw err
      }
    }

    return result
  }

  private async resolveAssetBackedAudioFile(body?: {
    asset_ref?: AssetRef
    assetRef?: AssetRef
    fileUrl?: string
    filename?: string
    mimeType?: string
  }): Promise<
    { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined
  > {
    const assetRef = body?.asset_ref ?? body?.assetRef
    const assetUrl =
      assetRef && typeof assetRef.url === 'string' && assetRef.url.trim().length > 0
        ? assetRef.url.trim()
        : null
    const fileUrl = body?.fileUrl?.trim() || assetUrl
    if (!fileUrl) return undefined

    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new BadRequestException(`Failed to fetch audio file (${response.status})`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const mimetype =
      body?.mimeType?.trim() ||
      assetRef?.mime_type ||
      response.headers.get('content-type') ||
      'application/octet-stream'
    const originalname =
      body?.filename?.trim() || assetRef?.original_filename || assetRef?.name || 'audio'

    return {
      buffer,
      mimetype,
      originalname,
      size: assetRef?.file_size ?? buffer.length,
    }
  }

  @Post('stream-config')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  getStreamConfig(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() _scope: RequestScope,
  ) {
    this.logger.log(`POST /transcribe/stream-config - User: ${user.id}`)
    return this.transcribeService.getStreamConfig(user)
  }

  @Post('stream-usage')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async trackStreamUsage(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: unknown,
    @OrgContext() _scope: RequestScope,
  ) {
    this.logger.log(`POST /transcribe/stream-usage - User: ${user.id}`)

    const parsed = StreamUsageSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'Invalid request body',
        details: parsed.error.issues,
      })
    }

    const result = await this.transcribeService.trackStreamUsage(parsed.data, user)

    const durationSec = parsed.data.durationSeconds ?? 0
    if (durationSec > 0) {
      const estimatedTokens = Math.round(durationSec * 25)
      try {
        await this.creditsService.processDirectTextUsage({
          userId: user.id,
          orgId: _scope.orgId ?? undefined,
          feature: 'transcribe',
          action: 'stream',
          modelName: `deepgram/${parsed.data.model ?? 'nova-3'}`,
          usage: {
            input: estimatedTokens,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: estimatedTokens,
          },
          costSource: 'deepgram_estimate',
        })
      } catch (err) {
        this.logger.warn(
          `credit_deduction_failed feature=transcribe action=stream userId=${user.id} durationSec=${durationSec} estimatedTokens=${estimatedTokens} err=${err instanceof Error ? err.message : String(err)}`,
        )
        throw err
      }
    }

    return result
  }

  @Get('test')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  testApiKey(@OrgContext() _scope: RequestScope) {
    this.logger.log('GET /transcribe/test')
    return this.transcribeService.testApiKey()
  }
}
