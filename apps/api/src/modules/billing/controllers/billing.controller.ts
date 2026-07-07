/**
 * Billing Controller
 *
 * Handles billing routes for checkout, portal, invoices, and subscription account actions.
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase } from '@vibey/api-shared'
import type {
  CheckoutBody,
  PortalBody,
  RedeemPromoBody,
} from '../billing-http.types'
import { BillingUserActionsService } from '../services/billing-user-actions.service'
import { StripeService } from '../services/stripe.service'

@Controller('billing')
export class BillingController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly billingUserActionsService: BillingUserActionsService,
  ) {}

  @Post('checkout')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async createCheckout(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: CheckoutBody,
  ): Promise<{ sessionId: string; url: string; charged?: boolean }> {
    if (!body.planSlug) {
      throw new BadRequestException('planSlug is required')
    }

    if (!body.billingPeriod || !['monthly', 'annual'].includes(body.billingPeriod)) {
      throw new BadRequestException('billingPeriod must be "monthly" or "annual"')
    }

    const appUrl = process.env.APP_URL
    if (!appUrl) throw new Error('APP_URL env var is required')
    const successUrl = body.successUrl ?? `${appUrl}/studio?subscription=success`
    const cancelUrl = body.cancelUrl ?? `${appUrl}/studio?canceled=true`

    return this.stripeService.createCheckoutSession(
      user.id,
      user.email,
      body.planSlug,
      body.billingPeriod,
      successUrl,
      cancelUrl,
    )
  }

  @Post('redeem-promo')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  redeemPromo(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: RedeemPromoBody,
  ) {
    return this.billingUserActionsService.redeemPromo(user.id, supabase, body)
  }

  @Post('portal')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async createPortal(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: PortalBody,
  ): Promise<{ url: string }> {
    const customerId = await this.stripeService.getCustomerIdForUser(user.id)

    if (!customerId) {
      throw new BadRequestException(
        'No active subscription found. Please subscribe to a plan first.',
      )
    }

    const appUrl = process.env.APP_URL
    if (!appUrl) throw new Error('APP_URL env var is required')
    const returnUrl = body.returnUrl ?? appUrl

    return this.stripeService.createPortalSession(customerId, returnUrl)
  }

  @Get('invoices')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getInvoices(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Query('limit') limitParam?: string,
  ) {
    return this.billingUserActionsService.getInvoices(user.id, supabase, limitParam)
  }

  @Get('session-status')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getSessionStatus(
    @CurrentUser() user: { id: string; email: string },
    @Query('sessionId') sessionId?: string,
    @Query('type') _type?: string,
  ) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required')
    }

    return this.stripeService.getSessionStatus(sessionId, user.id)
  }

  @Post('switch-interval')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  switchInterval(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: { targetInterval: 'month' | 'year' },
  ) {
    if (!body.targetInterval || !['month', 'year'].includes(body.targetInterval)) {
      throw new BadRequestException('targetInterval must be "month" or "year"')
    }

    return this.stripeService.switchSubscriptionInterval(user.id, body.targetInterval)
  }

  @Post('cancel-subscription')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  cancelSubscription(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { reason?: string },
  ) {
    return this.billingUserActionsService.cancelSubscriptionAtPeriodEnd(
      user.id,
      supabase,
      body.reason,
    )
  }

  @Post('reactivate-subscription')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  reactivateSubscription(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.billingUserActionsService.reactivateSubscription(user.id, supabase)
  }
}
