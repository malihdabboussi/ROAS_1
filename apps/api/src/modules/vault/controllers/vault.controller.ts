import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
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
import { VaultService } from '../services/vault.service'

@Controller('vault')
export class VaultController {
  constructor(private readonly vault: VaultService) {}

  @Get('secrets')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listSecrets(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() _scope: RequestScope,
  ) {
    const secrets = await this.vault.listSecrets(supabase, user.id)
    return { success: true, secrets }
  }

  @Delete('secrets/:provider/:label')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  async deleteSecret(
    @CurrentUser() user: { id: string },
    @Param('provider') provider: string,
    @Param('label') label: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.vault.deleteSecret(user.id, provider, label)
    return { success: true }
  }
}
