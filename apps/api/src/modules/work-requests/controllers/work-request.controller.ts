import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Response } from 'express'
import { AuthGuard, Public, ZodValidationPipe } from '@vibey/api-shared'
import {
  CreateWorkRequestDraftWebhookSchema,
  RefreshWorkRequestDraftWebhookSchema,
  SendWorkRequestReviewChatSchema,
  StampWorkRequestConversationSchema,
  UpdateWorkRequestDraftSchema,
  WorkRequestTokenParamSchema,
  type CreateWorkRequestDraftWebhookDto,
  type RefreshWorkRequestDraftWebhookDto,
  type SendWorkRequestReviewChatDto,
  type StampWorkRequestConversationDto,
  type UpdateWorkRequestDraftDto,
} from '../dto/work-request.dto'
import { WorkRequestChatService } from '../services/work-request-chat.service'
import { WorkRequestService } from '../services/work-request.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class WorkRequestController {
  constructor(
    private readonly workRequests: WorkRequestService,
    private readonly workRequestChat: WorkRequestChatService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('work-requests/review/:token')
  getReview(@Param(new ZodValidationPipe(WorkRequestTokenParamSchema)) params: { token: string }) {
    return this.workRequests.getReview(params.token)
  }

  @Public()
  @Get('work-requests/review/:token/chat')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getReviewChat(
    @Param(new ZodValidationPipe(WorkRequestTokenParamSchema)) params: { token: string },
  ) {
    return this.workRequestChat.getReviewChat(params.token)
  }

  @Public()
  @Post('work-requests/review/:token/chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async sendReviewChat(
    @Param(new ZodValidationPipe(WorkRequestTokenParamSchema)) params: { token: string },
    @Body(new ZodValidationPipe(SendWorkRequestReviewChatSchema))
    body: SendWorkRequestReviewChatDto,
    @Res() res: Response,
  ) {
    await this.workRequestChat.streamReviewChat(params.token, body.content, res)
  }

  @Public()
  @Patch('work-requests/review/:token')
  updateReview(
    @Param(new ZodValidationPipe(WorkRequestTokenParamSchema)) params: { token: string },
    @Body(new ZodValidationPipe(UpdateWorkRequestDraftSchema)) body: UpdateWorkRequestDraftDto,
  ) {
    return this.workRequests.updateReview(params.token, body)
  }

  @Public()
  @Post('work-requests/review/:token/finalize')
  @HttpCode(HttpStatus.OK)
  finalizeReview(
    @Param(new ZodValidationPipe(WorkRequestTokenParamSchema)) params: { token: string },
  ) {
    return this.workRequests.finalizeReview(params.token)
  }

  @Public()
  @Post('work-requests/review/:token/refresh')
  @HttpCode(HttpStatus.OK)
  requestRefresh(
    @Param(new ZodValidationPipe(WorkRequestTokenParamSchema)) params: { token: string },
  ) {
    return this.workRequests.requestPublicRefresh(params.token)
  }

  @Public()
  @Post('integrations/page-grader/webhooks/work-request-drafts')
  @HttpCode(HttpStatus.OK)
  createDraft(
    @Headers('x-page-grader-signature') signature: string | undefined,
    @Body(new ZodValidationPipe(CreateWorkRequestDraftWebhookSchema))
    body: CreateWorkRequestDraftWebhookDto,
  ) {
    return this.workRequests.createFromPageGrader(signature ?? '', body)
  }

  @Public()
  @Post('integrations/page-grader/webhooks/work-request-drafts/refresh')
  @HttpCode(HttpStatus.OK)
  refreshDraft(
    @Headers('x-page-grader-signature') signature: string | undefined,
    @Body(new ZodValidationPipe(RefreshWorkRequestDraftWebhookSchema))
    body: RefreshWorkRequestDraftWebhookDto,
  ) {
    return this.workRequests.refreshFromPageGrader(signature ?? '', body)
  }

  @Public()
  @Post('internal/work-requests/process-reminders')
  @HttpCode(HttpStatus.OK)
  processReminders(@Headers('authorization') authorization: string | undefined) {
    const secret =
      this.config.get<string>('CRON_SECRET') ??
      process.env.CRON_SECRET ??
      this.config.get<string>('INTERNAL_API_TOKEN') ??
      process.env.INTERNAL_API_TOKEN
    if (!secret || authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret')
    }
    return this.workRequests.processDueWork()
  }

  @Public()
  @Post('internal/work-requests/stamp-conversation')
  @HttpCode(HttpStatus.OK)
  stampConversation(
    @Headers('authorization') authorization: string | undefined,
    @Body(new ZodValidationPipe(StampWorkRequestConversationSchema))
    body: StampWorkRequestConversationDto,
  ) {
    const secret = this.config.get<string>('INTERNAL_API_TOKEN') ?? process.env.INTERNAL_API_TOKEN
    if (!secret || authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid internal token')
    }
    return this.workRequests.stampConversation(body.draft_id, body.conversation_id)
  }
}
