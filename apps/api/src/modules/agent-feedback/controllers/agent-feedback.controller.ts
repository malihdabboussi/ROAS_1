import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  LookupAgentFeedbackSchema,
  SaveAgentFeedbackSchema,
  type LookupAgentFeedbackDto,
  type SaveAgentFeedbackDto,
} from '../dto/agent-feedback.dto'
import { AgentFeedbackService } from '../services/agent-feedback.service'

@Controller('agent-feedback')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentFeedbackController {
  constructor(private readonly feedbackService: AgentFeedbackService) {}

  @Post()
  async saveFeedback(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(SaveAgentFeedbackSchema)) body: SaveAgentFeedbackDto,
  ) {
    return this.feedbackService.saveFeedback(supabase, user.id, scope, body)
  }

  @Post('lookup')
  async lookupFeedback(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(LookupAgentFeedbackSchema)) body: LookupAgentFeedbackDto,
  ) {
    return this.feedbackService.lookupFeedback(supabase, user.id, body.targets)
  }
}
