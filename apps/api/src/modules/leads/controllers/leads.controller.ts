import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { EMAIL_RE, sanitize, UUID_RE } from './leads-controller-utils'
import { LeadsService } from '../services/leads.service'

@Controller('leads')
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name)

  constructor(private readonly leadsService: LeadsService) {}

  /**
   * GET /api/leads?funnel_id=xxx OR GET /api/leads?campaign_id=xxx
   * Authenticated — RLS enforced via user JWT.
   */
  @Get()
  @UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
  async list(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('funnel_id') funnelId?: string,
    @Query('campaign_id') campaignId?: string,
  ) {
    if (campaignId) {
      return this.leadsService.getLeadsByCampaign(supabase, campaignId, scope.orgId)
    }
    if (funnelId) {
      return this.leadsService.getLeadsByFunnel(supabase, funnelId, scope.orgId)
    }
    throw new BadRequestException('funnel_id or campaign_id query param is required')
  }

  /**
   * POST /api/leads/ingest
   * PUBLIC — no AuthGuard. Receives submissions from public funnel pages.
   * Rate limited: 10 requests per 60 seconds per IP.
   */
  @Post('ingest')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async ingest(
    @Body()
    body: {
      email?: string
      funnelId?: string
      name?: string
      phone?: string
      pageSlug?: string
      sourceDomain?: string
      utm?: Record<string, unknown>
      visitorId?: string
    },
    @Req() req: Request,
  ) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
      throw new BadRequestException('Valid email is required')
    }

    const funnelId = typeof body.funnelId === 'string' ? body.funnelId.trim() : ''
    if (!funnelId || !UUID_RE.test(funnelId)) {
      throw new BadRequestException('Valid funnelId is required')
    }

    const name = sanitize(body.name, 200)
    const phone = sanitize(body.phone, 30)
    const pageSlug = sanitize(body.pageSlug, 100)
    const sourceDomain = sanitize(body.sourceDomain, 253)
    const visitorId = sanitize(body.visitorId, 100)

    this.logger.log(`[Lead Ingest] ${email} → funnel ${funnelId}`)

    return this.leadsService.ingestLead({
      funnelId,
      email,
      name,
      phone,
      pageSlug,
      sourceDomain,
      utm: body.utm,
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip,
      visitorId,
    })
  }
}
