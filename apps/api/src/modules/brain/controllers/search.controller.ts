import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
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
import { BrainPermissionsService } from '../services/brain-permissions.service'
import { BrainRetrievalService } from '../services/brain-retrieval.service'
import { FeedbackService } from '../services/feedback.service'
import { SearchService } from '../services/search.service'

@Controller('brain/search')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly feedbackService: FeedbackService,
    private readonly brainPermissions: BrainPermissionsService,
    private readonly brainRetrieval: BrainRetrievalService,
  ) {}

  @Get()
  @UseGuards(CreditsGuard)
  async search(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('q') q?: string,
    @Query('mode') mode?: 'semantic' | 'graph' | 'hybrid' | 'summary' | 'chain' | 'auto',
    @Query('limit') limit?: string,
    @Query('brainId') brainId?: string,
    @Query('agentId') agentId?: string,
  ) {
    const query = (q ?? '').trim()
    if (!query) throw new Error('q is required')
    if (scope.orgId && scope.orgRole === 'viewer') {
      throw new ForbiddenException('Viewers cannot access Brain')
    }
    if (brainId?.trim()) {
      await this.brainPermissions.assertCanQueryBrain(supabase, user.id, scope, brainId.trim())
    }
    const legacy = await this.searchService.search(supabase, user.id, {
      query,
      mode: mode ?? 'hybrid',
      limit: limit ? Number(limit) : 10,
      brainId,
      agentId,
      orgId: scope.orgId,
    })
    const grounded =
      (mode ?? 'hybrid') === 'hybrid'
        ? await this.brainRetrieval.search(supabase, {
            family: agentId?.trim() ? 'agent' : 'user',
            brainId: brainId?.trim() || undefined,
            agentKey: agentId?.trim() || undefined,
            query,
            userId: user.id,
            orgId: scope.orgId,
            orgRole: scope.orgRole,
            requiredAccess: 'query',
            limit: limit ? Number(limit) : 10,
          })
        : null
    return grounded
      ? {
          ...legacy,
          grounded_results: grounded.results,
          context_sufficient: grounded.context_sufficient,
          sufficiency: grounded.sufficiency,
          missing: grounded.missing,
          suggested_next_queries: grounded.suggested_next_queries,
        }
      : legacy
  }

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  async submitFeedback(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body()
    body: {
      snapshotId: string
      query: string
      rating: 1 | -1
      searchMode?: string
      position?: number
      comment?: string
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.feedbackService.submitFeedback(supabase, user.id, body)
  }

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  async searchByImage(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body()
    body: {
      base64: string
      mimeType: string
      caption?: string
      limit?: number
      brainId?: string
      agentId?: string
    },
    @OrgContext() scope: RequestScope,
  ) {
    const base64 = body.base64?.trim()
    const mimeType = body.mimeType?.trim()
    if (!base64 || !mimeType) throw new Error('base64 and mimeType are required')
    if (scope.orgId && scope.orgRole === 'viewer') {
      throw new ForbiddenException('Viewers cannot access Brain')
    }
    if (body.brainId?.trim()) {
      await this.brainPermissions.assertCanQueryBrain(supabase, user.id, scope, body.brainId.trim())
    }
    return this.searchService.searchByImage(supabase, user.id, {
      base64,
      mimeType,
      caption: body.caption?.trim(),
      limit: body.limit,
      brainId: body.brainId,
      agentId: body.agentId,
      orgId: scope.orgId,
    })
  }
}
