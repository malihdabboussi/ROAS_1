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
import { AuthGuard, Public, ZodValidationPipe } from '@vibey/api-shared'
import { MeetingFollowUpReviewService } from '../services/meeting-follow-up-review.service'

const TokenSchema = z.object({ token: z.string().min(32).max(200) })
const UpdateSchema = z.object({
  summary: z.string().trim().min(1).max(50_000),
  client_campaign: z.record(z.unknown()).nullable(),
  attendees: z.array(z.string().trim().min(1).max(500)).max(100),
  follow_up_message: z.string().max(100_000),
  dismissed_follow_up_ids: z.array(z.string().uuid()).max(200),
})
const ChatSchema = z.object({ content: z.string().trim().min(1).max(50_000) })

@Controller('meeting-follow-up-reviews')
@UseGuards(AuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class MeetingFollowUpReviewController {
  constructor(private readonly reviews: MeetingFollowUpReviewService) {}

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
