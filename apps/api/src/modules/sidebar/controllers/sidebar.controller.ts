import { Controller, Get, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { SidebarService } from '../services/sidebar.service'

@Controller('sidebar')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SidebarController {
  constructor(private readonly sidebarService: SidebarService) {}

  @Get('team2-bootstrap')
  async getTeam2Bootstrap(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.sidebarService.getTeam2Bootstrap(supabase, user.id, scope)
  }

  @Get('people')
  async getPeople(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    const people = await this.sidebarService.getPeople(supabase, user.id, scope)
    return { people }
  }
}
