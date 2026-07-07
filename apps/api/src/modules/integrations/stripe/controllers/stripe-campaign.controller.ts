import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase } from '@vibey/api-shared'
import {
  CreateStripeCouponSchema,
  CreateStripePaymentLinkSchema,
  CreateStripePriceSchema,
  CreateStripeProductSchema,
} from '../dto/stripe.dto'
import { StripeApiService } from '../services/stripe-api.service'

@Controller('integrations/stripe')
@UseGuards(AuthGuard)
export class StripeCampaignController {
  constructor(private readonly api: StripeApiService) {}

  @Get('campaigns/:campaignId/products')
  async listCampaignProducts(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('campaignId') campaignId: string,
  ) {
    return this.api.getCampaignProducts(supabase, user.id, campaignId)
  }

  @Get('campaigns/:campaignId/payment-links')
  async listCampaignPaymentLinks(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('campaignId') campaignId: string,
  ) {
    return this.api.getCampaignPaymentLinks(supabase, user.id, campaignId)
  }

  @Get('campaigns/:campaignId/coupons')
  async listCampaignCoupons(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('campaignId') campaignId: string,
  ) {
    return this.api.getCampaignCoupons(supabase, user.id, campaignId)
  }

  @Get('products/:productId/prices')
  async listProductPrices(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    return this.api.getProductPrices(supabase, user.id, productId)
  }

  @Patch('products/:productId')
  async updateProduct(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
    @Body() body: { name?: string; description?: string; active?: boolean },
  ) {
    return this.api.updateProduct(supabase, user.id, productId, body)
  }

  @Delete('products/:productId')
  async deleteProduct(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    return this.api.deleteProduct(supabase, user.id, productId)
  }

  @Post('coupons')
  async createCoupon(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateStripeCouponSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createCoupon(supabase, user.id, validation.data)
  }

  @Post('campaigns/:campaignId/products')
  async createCampaignProduct(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('campaignId') campaignId: string,
    @Body() body: unknown,
  ) {
    const validation = CreateStripeProductSchema.safeParse({
      ...(body as object),
      campaign_id: campaignId,
    })
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createProduct(supabase, user.id, validation.data)
  }

  @Post('campaigns/:campaignId/prices')
  async createCampaignPrice(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('campaignId') campaignId: string,
    @Body() body: unknown,
  ) {
    const validation = CreateStripePriceSchema.safeParse({
      ...(body as object),
      campaign_id: campaignId,
    })
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createPrice(supabase, user.id, validation.data)
  }

  @Post('campaigns/:campaignId/payment-links')
  async createCampaignPaymentLink(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('campaignId') campaignId: string,
    @Body() body: unknown,
  ) {
    const validation = CreateStripePaymentLinkSchema.safeParse({
      ...(body as object),
      campaign_id: campaignId,
    })
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createPaymentLink(supabase, user.id, validation.data)
  }

  @Post('campaigns/:campaignId/coupons')
  async createCampaignCoupon(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('campaignId') campaignId: string,
    @Body() body: unknown,
  ) {
    const validation = CreateStripeCouponSchema.safeParse({
      ...(body as object),
      campaign_id: campaignId,
    })
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.createCoupon(supabase, user.id, validation.data)
  }
}
