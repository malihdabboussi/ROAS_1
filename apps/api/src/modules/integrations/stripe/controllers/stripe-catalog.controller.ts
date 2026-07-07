import { Body, Controller, Get, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import {
  CreateStripePaymentLinkSchema,
  CreateStripePriceSchema,
  CreateStripeProductSchema,
  CreateStripeRefundSchema,
} from '../dto/stripe.dto'
import { StripeApiService } from '../services/stripe-api.service'

@Controller('integrations/stripe')
export class StripeCatalogController {
  constructor(private readonly api: StripeApiService) {}

  @Post('products')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createProduct(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateStripeProductSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createProduct(supabase, user.id, validation.data)
  }

  @Get('products')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listProducts(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    return this.api.listProducts(supabase, user.id)
  }

  @Post('prices')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createPrice(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateStripePriceSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createPrice(supabase, user.id, validation.data)
  }

  @Get('prices')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listPrices(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    return this.api.listPrices(supabase, user.id)
  }

  @Post('payment-links')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createPaymentLink(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateStripePaymentLinkSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createPaymentLink(supabase, user.id, validation.data)
  }

  @Get('payment-links')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listPaymentLinks(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
  ) {
    return this.api.listPaymentLinks(supabase, user.id)
  }

  @Post('refunds')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createRefund(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateStripeRefundSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createRefund(supabase, user.id, validation.data)
  }
}
