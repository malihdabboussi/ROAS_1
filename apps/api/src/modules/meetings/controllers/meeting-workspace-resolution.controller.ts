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
import { MeetingItemMaterializeService } from '../services/meeting-item-materialize.service'
import { MeetingWorkspaceService } from '../services/meeting-workspace.service'

const ParamsSchema = z.object({ spaceId: z.string().uuid() })
const ScheduledMeetingDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString())

const OrganizerSchema = z
  .object({
    email: z.string().trim().email().max(500),
    name: z.string().trim().max(500).nullable().optional(),
  })
  .nullable()
  .optional()

export const ScheduledMeetingSchema = z.object({
  calendar_event_id: z.string().trim().min(1).max(2_000),
  ical_uid: z.string().trim().min(1).max(2_000).nullable().optional(),
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
  organizer: OrganizerSchema,
})

export const MaterializeMeetingsSchema = z.object({
  events: z.array(ScheduledMeetingSchema).max(80),
})

export const InstantMeetingSchema = z.object({
  title: z.string().trim().min(1).max(500).default('Impromptu call'),
  attendee_emails: z.array(z.string().trim().email().max(500)).max(100).default([]),
})

@Controller('spaces/:spaceId/meetings')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MeetingWorkspaceResolutionController {
  constructor(
    private readonly meetings: MeetingWorkspaceService,
    private readonly materialize: MeetingItemMaterializeService,
  ) {}

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
        icalUid: body.ical_uid ?? null,
        title: body.title,
        start: body.start,
        end: body.end,
        description: body.description,
        location: body.location,
        videoUrl: body.video_url,
        htmlLink: body.html_link,
        attendees: body.attendees,
        organizer: body.organizer
          ? { email: body.organizer.email, name: body.organizer.name ?? null }
          : null,
      },
    })
  }

  @Post('materialize')
  @RequireOrgRole('editor')
  materializeScheduledMeetings(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ParamsSchema)) params: z.infer<typeof ParamsSchema>,
    @Body(new ZodValidationPipe(MaterializeMeetingsSchema))
    body: z.infer<typeof MaterializeMeetingsSchema>,
  ) {
    return this.materialize.materializeScheduledMeetings(supabase, {
      spaceId: params.spaceId,
      userId: user.id,
      orgId: scope.orgId,
      events: body.events.map((event) => ({
        calendarEventId: event.calendar_event_id,
        icalUid: event.ical_uid ?? null,
        title: event.title,
        start: event.start,
        end: event.end,
        description: event.description,
        location: event.location,
        videoUrl: event.video_url,
        htmlLink: event.html_link,
        attendees: event.attendees,
        organizer: event.organizer
          ? { email: event.organizer.email, name: event.organizer.name ?? null }
          : null,
      })),
    })
  }

  @Post('instant')
  @RequireOrgRole('editor')
  createInstantMeeting(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ParamsSchema)) params: z.infer<typeof ParamsSchema>,
    @Body(new ZodValidationPipe(InstantMeetingSchema))
    body: z.infer<typeof InstantMeetingSchema>,
  ) {
    return this.meetings.createInstantMeeting(supabase, {
      spaceId: params.spaceId,
      userId: user.id,
      orgId: scope.orgId,
      title: body.title,
      attendeeEmails: body.attendee_emails,
    })
  }
}
