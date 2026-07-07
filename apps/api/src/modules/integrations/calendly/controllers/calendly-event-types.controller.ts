import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import {
  CreateCalendlyEventTypeSchema,
  CreateCalendlyOneOffEventTypeSchema,
  UpdateCalendlyEventTypeSchema,
} from '../dto/calendly.dto'
import { CalendlyApiService } from '../services/calendly-api.service'

@Controller('integrations/calendly')
export class CalendlyEventTypesController {
  constructor(private readonly api: CalendlyApiService) {}

  @Get('event-types')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listEventTypes(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    return this.api.listEventTypes(supabase, user.id)
  }

  @Get('event-types/:uuid')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getEventType(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('uuid') uuid: string,
  ) {
    return this.api.getEventType(supabase, user.id, uuid)
  }

  @Post('event-types')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createEventType(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateCalendlyEventTypeSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createEventType(supabase, user.id, validation.data)
  }

  @Patch('event-types/:uuid')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateEventType(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('uuid') uuid: string,
    @Body() body: unknown,
  ) {
    const validation = UpdateCalendlyEventTypeSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.updateEventType(supabase, user.id, uuid, validation.data)
  }

  @Post('one-off-event-types')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createOneOffEventType(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateCalendlyOneOffEventTypeSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createOneOffEventType(supabase, user.id, validation.data)
  }
}
