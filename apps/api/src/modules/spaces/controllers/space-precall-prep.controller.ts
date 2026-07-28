import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { SpaceIdParamSchema, type SpaceIdParam } from '../dto'
import { MeetingsPrecallPrepService } from '../services/meetings-precall-prep.service'
import { SpacePermissionsService } from '../services/space-permissions.service'

const PrecallPrepTodayBodySchema = z.object({
  timezone: z.string().min(1).max(100).optional(),
  refresh: z.boolean().optional(),
})
type PrecallPrepTodayBody = z.infer<typeof PrecallPrepTodayBodySchema>

const PrecallPrepEventBodySchema = z.object({
  calendar_event_id: z.string().min(1).max(500),
  timezone: z.string().min(1).max(100).optional(),
  refresh: z.boolean().optional(),
  event_start: z.string().min(1).max(64).optional(),
  event: z
    .object({
      title: z.string().min(1).max(500),
      start: z.string().min(1).max(64),
      end: z.string().min(1).max(64),
      all_day: z.boolean(),
      video_url: z.string().max(2000).nullable().optional(),
      location: z.string().max(2000).nullable().optional(),
      attendees: z
        .array(
          z.object({
            email: z.string().max(320).nullable().optional(),
            name: z.string().max(200).nullable().optional(),
          }),
        )
        .max(100)
        .optional(),
    })
    .optional(),
})
type PrecallPrepEventBody = z.infer<typeof PrecallPrepEventBodySchema>

@Controller('spaces/:id/precall-prep')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpacePrecallPrepController {
  constructor(
    private readonly prep: MeetingsPrecallPrepService,
    private readonly permissions: SpacePermissionsService,
  ) {}

  @Post('today')
  @HttpCode(HttpStatus.OK)
  async runToday(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(PrecallPrepTodayBodySchema)) body: PrecallPrepTodayBody,
  ) {
    await this.permissions.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'edit',
      scope.orgId,
    )
    return this.prep.runForToday({
      supabase,
      userId: user.id,
      orgId: scope.orgId,
      spaceId: params.id,
      timezone: body.timezone,
      refresh: body.refresh !== false,
      scope,
    })
  }

  @Post('event')
  @HttpCode(HttpStatus.OK)
  async runEvent(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(PrecallPrepEventBodySchema)) body: PrecallPrepEventBody,
  ) {
    await this.permissions.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'edit',
      scope.orgId,
    )
    return this.prep.runForEvent({
      supabase,
      userId: user.id,
      orgId: scope.orgId,
      spaceId: params.id,
      calendarEventId: body.calendar_event_id,
      timezone: body.timezone,
      refresh: body.refresh !== false,
      scope,
      eventSnapshot: body.event ?? null,
      eventStartHint: body.event_start ?? body.event?.start ?? null,
    })
  }
}
