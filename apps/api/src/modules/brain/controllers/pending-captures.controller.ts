import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { PendingCapturesService } from '../services/pending-captures.service'

@Controller('brain/pending')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class PendingCapturesController {
  constructor(private readonly pendingService: PendingCapturesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.pendingService.listPending(supabase, user.id)
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.pendingService.acceptCapture(supabase, user.id, id)
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.pendingService.rejectCapture(supabase, user.id, id)
  }
}
