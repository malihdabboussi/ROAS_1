import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { MeetingWorkspaceService } from '../services/meeting-workspace.service'

const ParamsSchema = z.object({ spaceId: z.string().uuid() })
const ScheduledMeetingDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString())

export const ScheduledMeetingSchema = z.object({
  calendar_event_id: z.string().trim().min(1).max(2_000),
  title: z.string().trim().min(1).max(500),
  start: ScheduledMeetingDateTimeSchema,
  end: ScheduledMeetingDateTimeSchema,
  description: z.string().max(50_000).nullable().optional(),
  location: z.string().max(5_000).nullable().optional(),
  video_url: z.string().url().max(5_000).nullable().optional(),
  html_link: z.string().url().max(5_000).nullable().optional(),
  attendees: z
    .array(
      z.object({
        email: z.string().trim().email().max(500),
        name: z.string().trim().max(500).nullable().optional(),
      }),
    )
    .max(500),
})

@Controller('spaces/:spaceId/meetings')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MeetingWorkspaceResolutionController {
  constructor(private readonly meetings: MeetingWorkspaceService) {}

  @Post('resolve')
  @RequireOrgRole('editor')
  resolveScheduledMeeting(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ParamsSchema)) params: z.infer<typeof ParamsSchema>,
    @Body(new ZodValidationPipe(ScheduledMeetingSchema))
    body: z.infer<typeof ScheduledMeetingSchema>,
  ) {
    return this.meetings.resolveScheduledMeeting(supabase, {
      spaceId: params.spaceId,
      userId: user.id,
      orgId: scope.orgId,
      event: {
        calendarEventId: body.calendar_event_id,
        title: body.title,
        start: body.start,
        end: body.end,
        description: body.description,
        location: body.location,
        videoUrl: body.video_url,
        htmlLink: body.html_link,
        attendees: body.attendees,
      },
    })
  }
}
