import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { MeetingConnectionsService } from '../services/meeting-connections.service'
import { MeetingsSpaceBootstrapService } from '../services/meetings-space-bootstrap.service'

const ConnectSchema = z.object({ secret: z.string().max(512).optional() })

/**
 * Connect flow for note takers defined from Settings (`nt_` ids). Built-in
 * tools keep their own controllers; this one reads everything it needs from
 * the definition.
 */
@Controller('integrations/meetings/:provider')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class MeetingConnectionsController {
  constructor(
    private readonly connections: MeetingConnectionsService,
    private readonly meetingsSpace: MeetingsSpaceBootstrapService,
  ) {}

  @Get('status')
  async status(@Param('provider') provider: string, @CurrentUser() user: { id: string }) {
    const result = await this.connections.status(provider, user.id)
    return { success: true, ...result }
  }

  /** Address to paste into the tool, available before connecting. */
  @Get('webhook-address')
  async webhookAddress(@Param('provider') provider: string, @CurrentUser() user: { id: string }) {
    const result = await this.connections.webhookAddress(provider, user.id)
    return { success: true, ...result }
  }

  @Post('connect')
  async connect(
    @Param('provider') provider: string,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
    @Body() body: unknown,
  ) {
    const validation = ConnectSchema.safeParse(body ?? {})
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.connections.connect(provider, user.id, validation.data.secret)
    // Meetings from a defined note taker land in the same Meetings space Fathom uses.
    await this.meetingsSpace.ensureMeetingsSpaceQuietly(supabase, scope)
    return { success: true, ...result }
  }

  @Post('disconnect')
  async disconnect(@Param('provider') provider: string, @CurrentUser() user: { id: string }) {
    await this.connections.disconnect(provider, user.id)
    return { success: true }
  }
}
