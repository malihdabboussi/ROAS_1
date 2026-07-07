import {
  Body,
  Controller,
  Get,
  Post,
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
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { GoogleDriveConnectionService } from '../services/google-drive-connection.service'

@Controller('integrations/google-drive')
export class GoogleDriveController {
  constructor(private readonly connectionService: GoogleDriveConnectionService) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.connectionService.status(supabase, user, scope)
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { redirectTo?: string },
  ) {
    return this.connectionService.connect(supabase, user, body)
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    return this.connectionService.disconnect(supabase, user)
  }
}
