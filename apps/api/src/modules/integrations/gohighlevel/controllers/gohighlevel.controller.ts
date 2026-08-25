import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { ConnectGhlPitSchema, UpsertGhlLeadContactSchema } from '../dto/gohighlevel.dto'
import { GoHighLevelApiService } from '../services/gohighlevel-api.service'

@Controller('integrations/lhg')
export class GoHighLevelController {
  constructor(private readonly api: GoHighLevelApiService) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const result = await this.api.getStatus(supabase, user.id)
    return { success: true, ...result }
  }

  @Get('contacts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listContacts(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const st = await this.api.getStatus(supabase, user.id)
    if (!st.connected) {
      throw new NotFoundException('GoHighLevel is not connected')
    }
    const { contacts } = await this.api.listLocationContactsForImport(supabase, user.id)
    return { success: true, contacts }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = ConnectGhlPitSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.connect(user.id, validation.data.pit, validation.data.locationId)
    return { success: true, ...result }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.api.disconnect(user.id)
    return { success: true }
  }

  @Post('upsert-lead-contact')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async upsertLeadContact(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = UpsertGhlLeadContactSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.upsertLeadContactInGhl(supabase, user.id, validation.data)
    return { success: true, ...result }
  }
}
