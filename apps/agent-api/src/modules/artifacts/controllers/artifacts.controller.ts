import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { Response } from 'express'
import { ZodValidationPipe } from '@vibey/api-shared'
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { ArtifactActionDto, ArtifactActionInput } from '../dtos/artifact-action.dto'
import { InternalAuthGuard } from '../guards/internal-auth.guard'
import { ArtifactsService } from '../services/artifacts.service'

/**
 * ArtifactsController
 *
 * Single endpoint for all artifact CRUD operations.
 * Called by the vibey_backend OpenClaw tool plugin from localhost.
 *
 * POST /api/artifacts
 * Body: { action: string, data: object }
 * Header: x-openclaw-internal: true
 * Header: x-session-key: agent:{agentId}:{agentId}-{userId}-{conversationId} (auto-injected by plugin)
 */
@Controller('artifacts')
@UseGuards(InternalAuthGuard, ThrottlerGuard)
@UseInterceptors(SyncReadyInterceptor)
export class ArtifactsController {
  private readonly logger = new Logger(ArtifactsController.name)
  private readonly now = () => Date.now()

  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleAction(
    @Body(new ZodValidationPipe(ArtifactActionDto)) body: ArtifactActionInput,
    @Headers('x-session-key') sessionKey?: string,
  ) {
    const startedAt = this.now()
    this.logger.log(
      `[Artifact] action=${body.action} sessionKey=${sessionKey ? 'present' : 'missing'} dataKeys=${Object.keys(body.data ?? {}).join(',')}`,
    )
    await this.artifactsService.assertCreditsForSession(sessionKey)
    const result = await this.artifactsService.executeAction(
      body.action,
      body.data ?? {},
      sessionKey,
    )
    const isError =
      result &&
      typeof result === 'object' &&
      'success' in result &&
      (result as Record<string, unknown>).success === false
    if (isError) {
      this.logger.warn(
        `[Artifact] action=${body.action} FAILED durationMs=${this.now() - startedAt}: ${JSON.stringify(result)}`,
      )
      throw new BadRequestException(result)
    } else {
      const id =
        result && typeof result === 'object' && 'id' in result
          ? (result as Record<string, unknown>).id
          : 'n/a'
      this.logger.log(
        `[Artifact] action=${body.action} OK id=${id} durationMs=${this.now() - startedAt}`,
      )
    }
    return result
  }

  @Post('stream')
  async handleActionStream(
    @Body(new ZodValidationPipe(ArtifactActionDto)) body: ArtifactActionInput,
    @Headers('x-session-key') sessionKey: string | undefined,
    @Res() res: Response,
  ) {
    const startedAt = this.now()
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    this.logger.log(
      `[Artifact Stream] action=${body.action} sessionKey=${sessionKey ? 'present' : 'missing'} dataKeys=${Object.keys(body.data ?? {}).join(',')}`,
    )

    try {
      await this.artifactsService.assertCreditsForSession(sessionKey)
      const result = await this.artifactsService.executeAction(
        body.action,
        body.data ?? {},
        sessionKey,
        async (message) => {
          sendEvent({ type: 'progress', message })
        },
      )

      const isError =
        result &&
        typeof result === 'object' &&
        'success' in result &&
        (result as Record<string, unknown>).success === false

      if (isError) {
        const errorPayload =
          result && typeof result === 'object'
            ? (result as Record<string, unknown>)
            : { success: false, error: 'Operation failed' }
        const errorMessage =
          'error' in errorPayload
            ? String(errorPayload.error ?? 'Operation failed')
            : 'Operation failed'
        this.logger.warn(
          `[Artifact Stream] action=${body.action} FAILED durationMs=${this.now() - startedAt}: ${errorMessage}`,
        )
        sendEvent({ type: 'error', error: errorPayload, message: errorMessage })
      } else {
        const id =
          result && typeof result === 'object' && 'id' in result
            ? (result as Record<string, unknown>).id
            : 'n/a'
        this.logger.log(
          `[Artifact Stream] action=${body.action} OK id=${id} durationMs=${this.now() - startedAt}`,
        )
        sendEvent({ type: 'result', result })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed'
      this.logger.error(
        `[Artifact Stream] action=${body.action} ERROR durationMs=${this.now() - startedAt}: ${message}`,
      )
      sendEvent({ type: 'error', message })
    } finally {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  }
}
