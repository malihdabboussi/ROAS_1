import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
} from '@vibey/api-shared'
import { parseUsageDateRange } from '../../billing/utils/usage-date-range'
import { OrgIdParamSchema, type OrgIdParam } from '../dto'
import { OrgBillingService } from '../services/org-billing.service'

function parseCampaignIds(raw?: string): string[] | null {
  if (!raw) return null
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return ids.length > 0 ? ids : null
}

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgBillingAnalyticsController {
  constructor(private readonly orgBilling: OrgBillingService) {}

  @Get(':orgId/billing/usage-analytics')
  @RequireOrgRole('admin')
  async getUsageAnalytics(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Supabase() supabase: SupabaseClient,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { p_start, p_end } = parseUsageDateRange(startDate, endDate)
    return this.orgBilling.getUsageAnalytics(supabase, params.orgId, p_start, p_end)
  }

  @Get(':orgId/billing/agent-spending')
  @RequireOrgRole('admin')
  async getAgentSpending(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Supabase() supabase: SupabaseClient,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaignIds') campaignIds?: string,
  ) {
    const { p_start, p_end } = parseUsageDateRange(startDate, endDate)
    const p_campaign_ids = parseCampaignIds(campaignIds)
    return this.orgBilling.getAgentSpending(supabase, params.orgId, p_start, p_end, p_campaign_ids)
  }

  @Get(':orgId/billing/members')
  @RequireOrgRole('admin')
  async getMemberUsage(@Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam) {
    const summary = await this.orgBilling.getMemberUsageSummary(params.orgId)
    return { success: true, members: summary }
  }

  @Get(':orgId/billing/human-spending')
  @RequireOrgRole('admin')
  async getHumanSpending(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Supabase() supabase: SupabaseClient,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaignIds') campaignIds?: string,
  ) {
    const { p_start, p_end } = parseUsageDateRange(startDate, endDate)
    const p_campaign_ids = parseCampaignIds(campaignIds)
    return this.orgBilling.getHumanSpending(supabase, params.orgId, p_start, p_end, p_campaign_ids)
  }
}
