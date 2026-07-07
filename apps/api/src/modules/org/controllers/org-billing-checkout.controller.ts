import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  ZodValidationPipe,
} from '@vibey/api-shared'
import { OrgIdParamSchema, type OrgIdParam } from '../dto'
import { OrgStripeService } from '../services/org-stripe.service'

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgBillingCheckoutController {
  constructor(private readonly orgStripe: OrgStripeService) {}

  @Post(':orgId/billing/checkout')
  @RequireOrgRole('owner')
  @HttpCode(HttpStatus.OK)
  async createCheckout(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @CurrentUser() user: { id: string; email: string },
    @Body()
    body: {
      planSlug: string
      billingPeriod: 'monthly' | 'annual'
      successUrl?: string
      cancelUrl?: string
    },
  ) {
    if (!body.planSlug) throw new HttpException('planSlug is required', HttpStatus.BAD_REQUEST)
    const appUrl = process.env.APP_URL ?? ''
    const successUrl = body.successUrl ?? `${appUrl}/studio?subscription=success`
    const cancelUrl = body.cancelUrl ?? `${appUrl}/studio?canceled=true`

    const result = await this.orgStripe.createOrgCheckoutSession(
      params.orgId,
      user.email,
      body.planSlug,
      body.billingPeriod ?? 'monthly',
      successUrl,
      cancelUrl,
    )
    return { success: true, ...result }
  }

  @Post(':orgId/billing/purchase-credits')
  @RequireOrgRole('admin')
  @HttpCode(HttpStatus.OK)
  async purchaseCredits(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @CurrentUser() user: { id: string; email: string },
    @Body() body: { packId: string; quantity?: number; successUrl?: string; cancelUrl?: string },
  ) {
    if (!body.packId) throw new HttpException('packId is required', HttpStatus.BAD_REQUEST)
    const appUrl = process.env.APP_URL ?? ''
    const successUrl = body.successUrl ?? `${appUrl}/studio?credits=purchased`
    const cancelUrl = body.cancelUrl ?? `${appUrl}/studio?canceled=true`

    const result = await this.orgStripe.createOrgCreditPurchaseSession(
      params.orgId,
      user.email,
      body.packId,
      successUrl,
      cancelUrl,
      body.quantity ?? 1,
      user.id,
    )
    return { success: true, ...result }
  }

  @Post(':orgId/billing/portal')
  @RequireOrgRole('owner')
  @HttpCode(HttpStatus.OK)
  async createPortal(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body() body: { returnUrl?: string },
  ) {
    const appUrl = process.env.APP_URL ?? ''
    const returnUrl = body.returnUrl ?? appUrl
    const result = await this.orgStripe.createOrgPortalSession(params.orgId, returnUrl)
    return { success: true, ...result }
  }

  @Get(':orgId/billing/invoices')
  @RequireOrgRole('owner')
  async getInvoices(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Query('limit') limitParam?: string,
  ) {
    const limit = Math.min(parseInt(limitParam ?? '12', 10) || 12, 50)
    const invoices = await this.orgStripe.listOrgInvoices(params.orgId, limit)
    return { success: true, invoices }
  }
}
