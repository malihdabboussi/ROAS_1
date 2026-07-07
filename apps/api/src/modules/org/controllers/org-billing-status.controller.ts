import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  ZodValidationPipe,
} from '@vibey/api-shared'
import {
  OrgIdParamSchema,
  UpdateOrgAutoRechargeSchema,
  type OrgIdParam,
  type UpdateOrgAutoRechargeInput,
} from '../dto'
import { OrgBillingService } from '../services/org-billing.service'

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgBillingStatusController {
  constructor(private readonly orgBilling: OrgBillingService) {}

  @Get(':orgId/billing/status')
  @RequireOrgRole('viewer')
  async getStatus(@Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam) {
    const [balance, plan, autoRecharge] = await Promise.all([
      this.orgBilling.getOrgBalance(params.orgId),
      this.orgBilling.getOrgPlan(params.orgId),
      this.orgBilling.getOrgAutoRecharge(params.orgId),
    ])

    return {
      success: true,
      balance,
      plan: plan
        ? {
            name: plan.name,
            slug: plan.slug,
            price: plan.price_amount,
            billingPeriod: plan.billing_period,
            baseCredits: plan.base_credits,
          }
        : null,
      autoRecharge,
    }
  }

  @Get(':orgId/billing/auto-recharge')
  @RequireOrgRole('viewer')
  async getAutoRecharge(@Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam) {
    return this.orgBilling.getOrgAutoRecharge(params.orgId)
  }

  @Post(':orgId/billing/auto-recharge')
  @RequireOrgRole('owner')
  @HttpCode(HttpStatus.OK)
  async updateAutoRecharge(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(UpdateOrgAutoRechargeSchema)) body: UpdateOrgAutoRechargeInput,
  ) {
    return this.orgBilling.updateOrgAutoRecharge(params.orgId, body)
  }

  @Get(':orgId/billing/usage')
  @RequireOrgRole('admin')
  async getUsageHistory(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
  ) {
    const limit = Math.min(parseInt(limitParam ?? '20', 10) || 20, 100)
    const offset = parseInt(offsetParam ?? '0', 10) || 0
    const result = await this.orgBilling.getOrgUsageHistory(params.orgId, limit, offset)
    return { success: true, ...result }
  }
}
