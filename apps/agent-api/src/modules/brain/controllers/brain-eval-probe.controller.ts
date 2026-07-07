import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import {
  BrainEvalProbeService,
  type EvalProbeBody,
  type EvalProbeResponse,
} from '../services/brain-eval-probe.service'

@Controller('internal/brain-eval')
@UseGuards(AuthGuard, OrgContextGuard)
export class BrainEvalProbeController {
  constructor(private readonly brainEvalProbeService: BrainEvalProbeService) {}

  @Post('configure')
  async configure(
    @Body() body: { env?: Record<string, string | null> },
  ): Promise<{
    applied: Record<string, string | null>
    current: Record<string, string | undefined>
  }> {
    return this.brainEvalProbeService.configure(body)
  }

  @Post('probe')
  async probe(
    @Body() body: EvalProbeBody,
    @CurrentUser() user: { id: string; email: string },
    @Supabase() userSupabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ): Promise<EvalProbeResponse> {
    return this.brainEvalProbeService.probe(body, user, userSupabase, scope)
  }
}
