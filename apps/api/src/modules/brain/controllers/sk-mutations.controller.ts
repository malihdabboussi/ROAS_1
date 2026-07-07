import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common'
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
import { BrainPermissionsService } from '../services/brain-permissions.service'
import { SkService } from '../services/sk.service'

@Controller('brain/sk')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SkMutationsController {
  constructor(
    private readonly skService: SkService,
    private readonly brainPermissions: BrainPermissionsService,
  ) {}

  @Delete('entries/:id')
  async deleteEntry(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.skService.deleteEntryWithTrainingPermission(
      supabase,
      user.id,
      scope,
      id,
      this.brainPermissions,
    )
  }

  @Delete('sources/:id')
  async deleteSource(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.skService.deleteSourceWithTrainingPermission(
      supabase,
      user.id,
      scope,
      id,
      this.brainPermissions,
    )
  }

  @Patch('mastery')
  @HttpCode(HttpStatus.OK)
  async updateMastery(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { entryId: string; score: number },
    @OrgContext() scope: RequestScope,
  ) {
    if (!body.entryId?.trim()) throw new Error('entryId is required')
    return this.skService.updateMasteryWithTrainingPermission(
      supabase,
      user.id,
      scope,
      body.entryId.trim(),
      body.score,
      this.brainPermissions,
    )
  }
}
