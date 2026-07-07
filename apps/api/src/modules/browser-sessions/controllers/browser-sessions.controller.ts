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
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
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
  DomainParamDto,
  type DomainParamInput,
  PatchSessionDto,
  type PatchSessionInput,
  SyncCookiesDto,
  type SyncCookiesInput,
} from '../dtos/browser-sessions.dtos'
import { BrowserSessionsService } from '../services/browser-sessions.service'

/**
 * Browser sessions surface consumed by the Vibey Chrome extension.
 *
 * Auth chain: AuthGuard → OrgContextGuard → OrgRoleGuard → ThrottlerGuard.
 * All reads/writes go through the user's RLS-enforced Supabase client (no
 * service-role key). Cookies are AES-256-GCM encrypted in the service before
 * landing in `browser_sessions.encrypted_cookies`.
 */
@Controller('browser-sessions')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class BrowserSessionsController {
  constructor(private readonly service: BrowserSessionsService) {}

  @Get('consent')
  async getConsent(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
  ) {
    const consentAt = await this.service.getConsent(supabase, user.id)
    return { ok: true, consent_at: consentAt }
  }

  @Post('consent')
  @HttpCode(HttpStatus.OK)
  async setConsent(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
  ) {
    const consentAt = await this.service.setConsent(supabase, user.id)
    return { ok: true, consent_at: consentAt }
  }

  @Get('config')
  async getConfig(@Supabase() supabase: SupabaseClient) {
    const domains = await this.service.getEnabledDomains(supabase)
    return { ok: true, domains }
  }

  @Get()
  async listSessions(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const sessions = await this.service.listSessions(supabase, user.id, scope.orgId)
    return { ok: true, sessions }
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncSession(
    @Body(new ZodValidationPipe(SyncCookiesDto)) dto: SyncCookiesInput,
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    await this.service.syncSession(supabase, user.id, scope.orgId, dto)
    return { ok: true }
  }

  @Delete(':domain')
  @HttpCode(HttpStatus.OK)
  async deleteSession(
    @Param(new ZodValidationPipe(DomainParamDto)) params: DomainParamInput,
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    await this.service.deleteSession(supabase, user.id, scope.orgId, params.domain)
    return { ok: true }
  }

  @Patch(':domain')
  @HttpCode(HttpStatus.OK)
  async patchSession(
    @Param(new ZodValidationPipe(DomainParamDto)) params: DomainParamInput,
    @Body(new ZodValidationPipe(PatchSessionDto)) dto: PatchSessionInput,
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    await this.service.setDisabled(supabase, user.id, scope.orgId, params.domain, dto.disabled)
    return { ok: true }
  }
}
