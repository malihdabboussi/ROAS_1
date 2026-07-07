import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { EmailLogsService } from '../services/email-logs.service'

@Controller('email/logs')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class EmailLogsController {
  constructor(private readonly emailLogsService: EmailLogsService) {}

  @Get()
  async getLogs(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    return this.emailLogsService.getLogs(
      supabase,
      user,
      scope,
      status,
      type,
      startDate,
      endDate,
      includeArchived,
      limitStr,
      offsetStr,
    )
  }

  @Get('schedules/count')
  async getScheduleCount(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('sequence_id') sequenceId?: string,
    @Query('status') status?: string,
  ) {
    return this.emailLogsService.getScheduleCount(supabase, user, scope, sequenceId, status)
  }

  @Patch(':id/archive')
  async archiveLog(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') logId: string,
    @Body() body: { archive: boolean },
    @OrgContext() scope: RequestScope,
  ) {
    return this.emailLogsService.archiveLog(supabase, user, logId, body, scope)
  }
}
