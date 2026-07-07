import {
  Body,
  Controller,
  Delete,
  Get,
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
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { CrystallizationService } from '../services/crystallization.service'
import { SnapshotsService } from '../services/snapshots.service'
import type { CreateSnapshotDto, CrystallizeDto, SnapshotType } from '../types/brain.types'

@Controller('brain/snapshots')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SnapshotsController {
  constructor(
    private readonly snapshotsService: SnapshotsService,
    private readonly crystallizationService: CrystallizationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @Body() body: CreateSnapshotDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.snapshotsService.createSnapshot(supabase, user.id, body, scope.orgId)
  }

  @Get()
  async list(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Query('type') type?: SnapshotType,
    @Query('tag') tag?: string,
    @Query('min_confidence') minConfidence?: string,
    @Query('limit') limit?: string,
  ) {
    return this.snapshotsService.listSnapshots(
      supabase,
      user.id,
      {
        type,
        tag,
        min_confidence: minConfidence ? Number(minConfidence) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
      scope.orgId,
    )
  }

  @Post('crystallize')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  async crystallize(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @Body() body: CrystallizeDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.crystallizationService.crystallize(
      supabase,
      body.input,
      user.id,
      body.source_type,
      body.source_id,
      undefined,
      scope.orgId,
      body.temporal ?? null,
    )
  }

  /** Stats must be declared before :id to avoid route collision. */
  @Get('stats')
  async stats(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Query('agent_id') agentId?: string,
  ) {
    return this.snapshotsService.getStats(supabase, user.id, agentId, scope.orgId)
  }

  /**
   * Interim: accepts query_embedding in body (POST).
   * US-007 will convert this to GET with ?q= once embedding generation is wired.
   */
  @Post('search')
  async search(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @Body() body: { query_embedding: number[]; limit?: number },
    @OrgContext() scope: RequestScope,
  ) {
    return this.snapshotsService.searchSnapshots(
      supabase,
      user.id,
      body.query_embedding,
      body.limit,
      scope.orgId,
    )
  }

  @Get(':id')
  async get(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.snapshotsService.getSnapshot(supabase, id)
  }

  @Patch(':id')
  async update(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: Partial<CreateSnapshotDto>,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.snapshotsService.updateSnapshot(supabase, id, body)
  }

  @Delete(':id')
  async remove(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.snapshotsService.deleteSnapshot(supabase, id)
    return { success: true }
  }
}
