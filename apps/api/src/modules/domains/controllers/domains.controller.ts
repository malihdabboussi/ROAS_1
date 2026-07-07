import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { AddDomainDto } from '../dto/add-domain.dto'
import { RemoveDomainDto } from '../dto/remove-domain.dto'
import { DomainsService } from '../services/domains.service'

@Controller('domains')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  async listDomains(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.domainsService.listDomains(supabase, user.id, scope.orgId)
  }

  @Post()
  @RequireOrgRole('admin')
  async addDomain(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: AddDomainDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.domainsService.addDomain(supabase, user.id, dto, scope.orgId)
  }

  @Delete()
  @RequireOrgRole('admin')
  async removeDomain(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: RemoveDomainDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.domainsService.removeDomain(supabase, user.id, dto, scope.orgId)
  }

  @Get('config')
  async getDomainConfig(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query('domain_name') domainName: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.domainsService.getDomainConfig(supabase, user.id, domainName, scope.orgId)
  }
}
