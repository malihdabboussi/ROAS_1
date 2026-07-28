import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
} from '@vibey/api-shared'
import { SyncPageGraderMeetingSchema } from '../dto/page-grader.dto'
import { PageGraderMeetingSyncService } from '../services/page-grader-meeting-sync.service'

@Controller('integrations/page-grader')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class PageGraderMeetingController {
  constructor(private readonly meetingSync: PageGraderMeetingSyncService) {}

  @Post('meetings/:spaceItemId/sync')
  @RequireOrgRole('editor')
  async syncMeeting(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('spaceItemId') spaceItemId: string,
    @Body() body: unknown,
  ) {
    const validation = SyncPageGraderMeetingSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.meetingSync.syncSpaceItem({
      supabase,
      userId: user.id,
      spaceItemId,
      clientIds: validation.data.client_ids,
    })
  }
}
