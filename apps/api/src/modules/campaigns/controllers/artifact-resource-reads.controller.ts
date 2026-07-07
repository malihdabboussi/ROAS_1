import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class ArtifactResourceReadsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('offers/:id')
  async getOffer(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getOffer(supabase, id)
  }

  @Get('offers/:id/avatar')
  async getOfferAvatar(
    @Supabase() supabase: SupabaseClient,
    @Param('id') offerId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getAvatar(supabase, offerId)
  }

  @Get('sequences/:id')
  async getSequence(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.getSequence(supabase, id)
  }
}
