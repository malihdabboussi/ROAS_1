import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { BrowserSessionsService, type BrowserCookie } from '../services/browser-sessions.service'

interface SyncBody {
  domain: string
  cookies: BrowserCookie[]
}

interface PatchDomainBody {
  disabled: boolean
}

@Controller('browser-sessions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class BrowserSessionsController {
  private readonly logger = new Logger(BrowserSessionsController.name)

  constructor(private readonly sessionsService: BrowserSessionsService) {}

  @Post('sync')
  async syncCookies(
    @CurrentUser() user: RequestScope,
    @OrgContext() orgId: string | null,
    @Body() body: SyncBody,
  ) {
    const domain = (body.domain ?? '').trim().toLowerCase()
    if (!domain) {
      return { ok: false, error: 'domain is required' }
    }
    const cookies = Array.isArray(body.cookies) ? body.cookies : []
    if (cookies.length === 0) {
      return { ok: false, error: 'cookies array is empty' }
    }
    if (cookies.length > 200) {
      return { ok: false, error: 'too many cookies (max 200)' }
    }

    const result = await this.sessionsService.syncCookies(
      user.userId,
      orgId,
      domain,
      cookies,
    )
    return result
  }

  @Get()
  async listSessions(@CurrentUser() user: RequestScope, @OrgContext() orgId: string | null) {
    const sessions = await this.sessionsService.listSessions(user.userId, orgId)
    return { ok: true, sessions }
  }

  @Get('config')
  async getDomainConfig() {
    const domains = await this.sessionsService.getDomainConfig()
    return { ok: true, domains }
  }

  @Get('consent')
  async getConsent(@CurrentUser() user: RequestScope) {
    const consent_at = await this.sessionsService.getUserConsent(user.userId)
    return { ok: true, consent_at }
  }

  @Post('consent')
  async recordConsent(@CurrentUser() user: RequestScope) {
    const result = await this.sessionsService.recordUserConsent(user.userId)
    return { ok: true, ...result }
  }

  @Patch(':domain')
  async updateDomain(
    @CurrentUser() user: RequestScope,
    @OrgContext() orgId: string | null,
    @Param('domain') domain: string,
    @Body() body: PatchDomainBody,
  ) {
    const result = await this.sessionsService.setDomainDisabled(
      user.userId,
      orgId,
      domain.toLowerCase(),
      Boolean(body.disabled),
    )
    return result
  }

  @Delete(':domain')
  async deleteCookies(
    @CurrentUser() user: RequestScope,
    @OrgContext() orgId: string | null,
    @Param('domain') domain: string,
  ) {
    await this.sessionsService.deleteCookies(user.userId, orgId, domain.toLowerCase())
    return { ok: true }
  }
}
