import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Response } from 'express'
import { z } from 'zod'
import { AuthGuard, CurrentUser, Public, ZodValidationPipe } from '@vibey/api-shared'
import { MeetingFollowUpReviewService } from '../services/meeting-follow-up-review.service'

const TokenSchema = z.object({ token: z.string().min(32).max(200) })
const UpdateSchema = z.object({
  summary: z.string().trim().min(1).max(50_000),
  client_campaign: z.record(z.unknown()).nullable(),
  attendee_ids: z.array(z.string().trim().min(1).max(500)).max(100),
  call_kind: z.string().trim().max(200),
  call_status: z.string().trim().max(200),
  follow_up_message: z.string().max(100_000),
  dismissed_follow_up_ids: z.array(z.string().uuid()).max(200),
  follow_ups: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(2_000),
        owner: z.string().trim().min(1).max(500),
        due_date: z.string().date(),
      }),
    )
    .max(200),
})
const ChatSchema = z.object({ content: z.string().trim().min(1).max(50_000) })
const AuthenticatedPreviewSchema = UpdateSchema.extend({
  space_id: z.string().uuid(),
  meeting_item_id: z.string().uuid(),
})

@Controller('meeting-follow-up-reviews')
@UseGuards(AuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class MeetingFollowUpReviewController {
  constructor(private readonly reviews: MeetingFollowUpReviewService) {}

  @Post('delegation-preview')
  @HttpCode(HttpStatus.OK)
  createAuthenticatedDelegationPreview(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(AuthenticatedPreviewSchema))
    body: z.infer<typeof AuthenticatedPreviewSchema>,
  ) {
    return this.reviews.createAuthenticatedDelegationPreview(user.id, body)
  }

  @Public()
  @Get(':token')
  getReview(@Param(new ZodValidationPipe(TokenSchema)) params: { token: string }) {
    return this.reviews.getReview(params.token)
  }

  @Public()
  @Patch(':token')
  updateReview(
    @Param(new ZodValidationPipe(TokenSchema)) params: { token: string },
    @Body(new ZodValidationPipe(UpdateSchema)) body: z.infer<typeof UpdateSchema>,
  ) {
    return this.reviews.updateReview(params.token, body)
  }

  @Public()
  @Post(':token/delegation-preview')
  @HttpCode(HttpStatus.OK)
  createDelegationPreview(@Param(new ZodValidationPipe(TokenSchema)) params: { token: string }) {
    return this.reviews.createDelegationPreview(params.token)
  }

  @Public()
  @Get(':token/chat')
  getChat(@Param(new ZodValidationPipe(TokenSchema)) params: { token: string }) {
    return this.reviews.getChat(params.token)
  }

  @Public()
  @Post(':token/chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chat(
    @Param(new ZodValidationPipe(TokenSchema)) params: { token: string },
    @Body(new ZodValidationPipe(ChatSchema)) body: z.infer<typeof ChatSchema>,
    @Res() res: Response,
  ) {
    await this.reviews.streamChat(params.token, body.content, res)
  }
}
