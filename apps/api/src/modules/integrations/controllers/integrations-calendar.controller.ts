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
import {
  CalendarAgendaQuerySchema,
  CalendarEventParamSchema,
  CreateCalendarEventSchema,
  DeleteCalendarEventQuerySchema,
  UpdateCalendarEventSchema,
  type CalendarAgendaQueryDto,
  type CalendarEventParamDto,
  type CreateCalendarEventDto,
  type DeleteCalendarEventQueryDto,
  type UpdateCalendarEventDto,
} from '../dto/calendar-events.dto'
import { IntegrationsCalendarService } from '../services/integrations-calendar.service'

@Controller('integrations/calendar')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class IntegrationsCalendarController {
  constructor(private readonly calendar: IntegrationsCalendarService) {}

  @Get('agenda')
  async getCalendarAgenda(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email?: string | null },
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(CalendarAgendaQuerySchema)) query: CalendarAgendaQueryDto,
  ) {
    return this.calendar.getAgenda(supabase, user, scope, query)
  }

  @Post('events')
  @HttpCode(HttpStatus.OK)
  async createCalendarEvent(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email?: string | null },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(CreateCalendarEventSchema)) body: CreateCalendarEventDto,
  ) {
    return this.calendar.createEvent(supabase, user, scope, body)
  }

  @Patch('events/:provider/:eventId')
  async updateCalendarEvent(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email?: string | null },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(CalendarEventParamSchema)) params: CalendarEventParamDto,
    @Body(new ZodValidationPipe(UpdateCalendarEventSchema)) body: UpdateCalendarEventDto,
  ) {
    return this.calendar.updateEvent(supabase, user, scope, params.provider, params.eventId, body)
  }

  @Delete('events/:provider/:eventId')
  @HttpCode(HttpStatus.OK)
  async deleteCalendarEvent(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email?: string | null },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(CalendarEventParamSchema)) params: CalendarEventParamDto,
    @Query(new ZodValidationPipe(DeleteCalendarEventQuerySchema))
    query: DeleteCalendarEventQueryDto,
  ) {
    return this.calendar.deleteEvent(supabase, user, scope, params.provider, params.eventId, query)
  }
}
