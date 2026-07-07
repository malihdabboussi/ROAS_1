import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, RoleGuard, Roles } from '@vibey/api-shared'
import { ImpersonationService } from '../services/impersonation.service'

function extractIp(req: { ip?: string; headers: Record<string, unknown> }): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim()
  }
  return req.ip ?? null
}

/**
 * Superadmin impersonation control plane. The AuthGuard never applies the
 * x-impersonate-user-id swap on these routes, so they always run as the
 * superadmin's real identity — required for the stop call to authorize
 * while an impersonation session is active.
 */
@Controller('admin/impersonation')
@UseGuards(AuthGuard, RoleGuard)
@Roles('superadmin')
export class ImpersonationController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  @Get('targets')
  async getTargets() {
    return this.impersonationService.getTargets()
  }

  @Post('start')
  async start(
    @Body() body: { targetUserId?: string },
    @CurrentUser() user: { id: string },
    @Req() req: { ip?: string; headers: Record<string, unknown> },
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.impersonationService.start(user.id, body?.targetUserId ?? '', {
      ip: extractIp(req),
      userAgent: userAgent ?? null,
    })
  }

  @Post('stop')
  async stop(
    @Body() body: { targetUserId?: string },
    @CurrentUser() user: { id: string },
    @Req() req: { ip?: string; headers: Record<string, unknown> },
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.impersonationService.stop(user.id, body?.targetUserId ?? '', {
      ip: extractIp(req),
      userAgent: userAgent ?? null,
    })
  }

  @Get('machine-target/:userId')
  async getMachineTarget(@Param('userId') userId: string) {
    return this.impersonationService.getMachineTarget(userId)
  }

  @Get('audit')
  async getAudit(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined
    return this.impersonationService.getAudit(
      Number.isFinite(parsed) && parsed! > 0 ? Math.min(parsed!, 500) : 100,
    )
  }
}
