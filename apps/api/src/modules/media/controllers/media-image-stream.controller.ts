import { Body, Controller, Logger, Post, Res, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Response } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { CreditsService } from '../../billing/services/credits.service'
import { EditImageSchema, GenerateImageSchema } from '../dto'
import { MediaService } from '../services/media.service'

@Controller('media')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MediaImageStreamController {
  private readonly logger = new Logger(MediaImageStreamController.name)

  constructor(
    private readonly mediaService: MediaService,
    private readonly creditsService: CreditsService,
  ) {}

  /**
   * POST /api/media/generate-stream
   * Generate an AI image with SSE progress events
   */
  @Post('generate-stream')
  @UseGuards(CreditsGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async generateImageStream(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    this.logger.log(`POST /media/generate-stream — user: ${user.id}`)

    const parsed = GenerateImageSchema.safeParse(body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues,
      })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let generationSucceeded = false
    let generationCompleteCount = 0
    try {
      await this.mediaService.generateImageStream(
        parsed.data,
        user,
        async (type: string, data: Record<string, unknown>) => {
          if (type === 'generation_complete') {
            generationSucceeded = true
            generationCompleteCount += 1
          }
          res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        },
        scope.orgId,
      )
      res.write('data: [DONE]\n\n')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Image stream error: ${message}`)
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
      res.write('data: [DONE]\n\n')
    } finally {
      if (generationSucceeded && generationCompleteCount > 0) {
        const modelName = parsed.data.model ?? 'gpt-5.4-image-2'
        for (let i = 0; i < generationCompleteCount; i++) {
          try {
            await this.creditsService.processImageUsage({
              userId: user.id,
              campaignId: parsed.data.campaign_id,
              orgId: scope.orgId ?? undefined,
              modelName,
            })
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Image credit deduction failed'
            this.logger.error(`Image credit deduction failed: ${message}`)
            res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
            break
          }
        }
      }
      res.end()
    }
  }

  /**
   * POST /api/media/edit-image-stream
   * Edit an existing image with SSE progress events
   */
  @Post('edit-image-stream')
  @UseGuards(CreditsGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async editImageStream(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    this.logger.log(`POST /media/edit-image-stream — user: ${user.id}`)

    const parsed = EditImageSchema.safeParse(body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues,
      })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let generationSucceeded = false
    try {
      await this.mediaService.generateImageEditStream(
        parsed.data,
        user,
        async (type: string, data: Record<string, unknown>) => {
          if (type === 'generation_complete') generationSucceeded = true
          res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        },
        scope.orgId,
      )
      res.write('data: [DONE]\n\n')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Image edit stream error: ${message}`)
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
      res.write('data: [DONE]\n\n')
    } finally {
      if (generationSucceeded) {
        const modelName = parsed.data.model ?? 'gpt-5.4-image-2'
        try {
          await this.creditsService.processImageUsage({
            userId: user.id,
            campaignId: parsed.data.campaign_id,
            orgId: scope.orgId ?? undefined,
            modelName,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Image edit credit deduction failed'
          this.logger.error(`Image edit credit deduction failed: ${message}`)
          res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
        }
      }
      res.end()
    }
  }
}
