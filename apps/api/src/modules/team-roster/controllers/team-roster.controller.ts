import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
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
import { CreditsGuard } from '../../billing/guards/credits.guard'
import {
  TeamRosterQuerySchema,
  TeamRosterUserIdParamSchema,
  UpdateTeamProfileSchema,
  type TeamRosterQuery,
  type TeamRosterUserIdParam,
  type UpdateTeamProfileDto,
} from '../dto'
import { TeamRosterSlackLearnerService } from '../services/team-roster-slack-learner.service'
import { TeamRosterService } from '../services/team-roster.service'

@Controller('team-roster')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class TeamRosterController {
  constructor(
    private readonly teamRosterService: TeamRosterService,
    private readonly slackLearnerService: TeamRosterSlackLearnerService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query(new ZodValidationPipe(TeamRosterQuerySchema)) query: TeamRosterQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.teamRosterService.list(supabase, user.id, scope.orgId, query)
  }

  @Patch('me')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateMe(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body(new ZodValidationPipe(UpdateTeamProfileSchema)) body: UpdateTeamProfileDto,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.teamRosterService.updateMe(supabase, user.id, body)
  }

  @Patch(':userId')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateMember(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(TeamRosterUserIdParamSchema)) params: TeamRosterUserIdParam,
    @Body(new ZodValidationPipe(UpdateTeamProfileSchema)) body: UpdateTeamProfileDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.teamRosterService.updateMember(supabase, user.id, scope.orgId, params.userId, body)
  }

  @Post(':userId/learn-from-slack')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async learnFromSlack(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(TeamRosterUserIdParamSchema)) params: TeamRosterUserIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.slackLearnerService.learnFromSlack(
      supabase,
      user.id,
      scope.orgId,
      params.userId,
    )
  }
}
