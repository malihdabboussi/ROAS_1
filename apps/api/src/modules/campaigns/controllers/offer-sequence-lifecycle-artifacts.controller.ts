import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
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
export class OfferSequenceLifecycleArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Patch('offers/:id')
  async updateOffer(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { name?: string },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updateOffer(supabase, id, body?.name)
  }

  @Delete('offers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOffer(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.artifactsService.deleteOffer(supabase, id)
  }

  @Patch('sequences/:id')
  async updateSequence(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { name?: string },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updateSequence(supabase, id, body?.name)
  }

  @Delete('sequences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSequence(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
    @Query('delete_mode') deleteMode?: 'keep_unsent' | 'remove_unsent',
  ) {
    if (deleteMode !== 'keep_unsent' && deleteMode !== 'remove_unsent') {
      throw new BadRequestException('delete_mode must be keep_unsent or remove_unsent')
    }
    await this.artifactsService.deleteSequence(supabase, id, deleteMode)
  }

  @Post('sequences/:id/sync-unsent')
  @HttpCode(HttpStatus.OK)
  async syncSequenceUnsent(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.syncSequenceUnsentEmails(supabase, id)
  }
}
