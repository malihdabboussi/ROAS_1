import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import {
  CancelCalendlyScheduledEventSchema,
  CreateCalendlyScheduledEventSchema,
  ListCalendlyAvailableTimesSchema,
  ListCalendlyScheduledEventsSchema,
} from '../dto/calendly.dto'
import { CalendlyApiService } from '../services/calendly-api.service'

@Controller('integrations/calendly')
export class CalendlyScheduledEventsController {
  constructor(private readonly api: CalendlyApiService) {}

  @Get('scheduled-events')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listScheduledEvents(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListCalendlyScheduledEventsSchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.listScheduledEvents(supabase, user.id, validation.data)
  }

  @Post('scheduled-events')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createScheduledEvent(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateCalendlyScheduledEventSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createScheduledEvent(supabase, user.id, validation.data)
  }

  @Post('scheduled-events/:uuid/cancel')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async cancelScheduledEvent(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('uuid') uuid: string,
    @Body() body: unknown,
  ) {
    const validation = CancelCalendlyScheduledEventSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.cancelScheduledEvent(supabase, user.id, uuid, validation.data.reason)
  }

  @Get('available-times')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listAvailableTimes(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListCalendlyAvailableTimesSchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.listAvailableTimes(
      supabase,
      user.id,
      validation.data.event_type,
      validation.data.start_time,
      validation.data.end_time,
    )
  }
}
