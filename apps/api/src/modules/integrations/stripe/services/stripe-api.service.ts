import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { z } from 'zod'
import type {
  CreateStripeCouponSchema,
  CreateStripePaymentLinkSchema,
  CreateStripePriceSchema,
  CreateStripeProductSchema,
} from '../dto/stripe.dto'
import { StripeIntegration } from '../integrations/stripe.integration'
import type { StripeBalanceTransaction } from '../types/stripe.types'
import { StripeOAuthService } from './stripe-oauth.service'

@Injectable()
export class StripeApiService {
  constructor(
    private readonly stripe: StripeIntegration,
    private readonly oauth: StripeOAuthService,
  ) {}

  async createProduct(
    supabase: SupabaseClient,
    userId: string,
    input: z.infer<typeof CreateStripeProductSchema>,
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.createProduct(token, {
      ...input,
      metadata: this.withCampaignMetadata(input),
    })
  }

  async updateProduct(
    supabase: SupabaseClient,
    userId: string,
    productId: string,
    input: { name?: string; description?: string; active?: boolean },
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.updateProduct(token, productId, input)
  }

  async deleteProduct(supabase: SupabaseClient, userId: string, productId: string) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.deleteProduct(token, productId)
  }

  async listProducts(supabase: SupabaseClient, userId: string) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listProducts(token)
  }

  async createPrice(
    supabase: SupabaseClient,
    userId: string,
    input: z.infer<typeof CreateStripePriceSchema>,
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.createPrice(token, {
      ...input,
      metadata: this.withCampaignMetadata(input),
    })
  }

  async listPrices(supabase: SupabaseClient, userId: string) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listPrices(token)
  }

  async createPaymentLink(
    supabase: SupabaseClient,
    userId: string,
    input: z.infer<typeof CreateStripePaymentLinkSchema>,
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.createPaymentLink(token, {
      ...input,
      metadata: this.withCampaignMetadata(input),
    })
  }

  async listPaymentLinks(supabase: SupabaseClient, userId: string) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listPaymentLinks(token)
  }

  async createRefund(
    supabase: SupabaseClient,
    userId: string,
    input: {
      charge: string
      amount?: number
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
      campaign_id?: string
      campaign_name?: string
      metadata?: Record<string, string>
    },
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.createRefund(token, {
      ...input,
      metadata: this.withCampaignMetadata(input),
    })
  }

  async listCharges(
    supabase: SupabaseClient,
    userId: string,
    opts?: {
      limit?: number
      starting_after?: string
      created_gte?: number
      created_lte?: number
      customer?: string
    },
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listCharges(token, opts)
  }

  async listCustomers(
    supabase: SupabaseClient,
    userId: string,
    opts?: {
      limit?: number
      starting_after?: string
      email?: string
      created_gte?: number
      created_lte?: number
    },
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listCustomers(token, opts)
  }

  async listSubscriptions(
    supabase: SupabaseClient,
    userId: string,
    opts?: {
      limit?: number
      starting_after?: string
      status?: string
      customer?: string
      created_gte?: number
      created_lte?: number
    },
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listSubscriptions(token, opts)
  }

  async listInvoices(
    supabase: SupabaseClient,
    userId: string,
    opts?: {
      limit?: number
      starting_after?: string
      status?: string
      customer?: string
      subscription?: string
      created_gte?: number
      created_lte?: number
    },
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listInvoices(token, opts)
  }

  async getOverview(
    supabase: SupabaseClient,
    userId: string,
    input: { fromUnix?: number; toUnix?: number },
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    const fromUnix = input.fromUnix ?? Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    const toUnix = input.toUnix ?? Math.floor(Date.now() / 1000)

    const list = await this.stripe.listBalanceTransactions(token, fromUnix, toUnix)
    const txns = list.data ?? []

    const metrics = txns.reduce(
      (acc, txn) => {
        const category = txn.reporting_category || txn.type
        if (category === 'charge' || txn.type === 'charge') {
          if (txn.amount > 0) acc.gross += txn.amount
        }
        if (category === 'refund' || txn.type === 'refund') {
          acc.refunds += Math.abs(txn.amount)
        }
        if (txn.fee > 0) acc.fees += txn.fee
        if (txn.type === 'stripe_fee') acc.fees += Math.abs(txn.amount)
        return acc
      },
      { gross: 0, refunds: 0, fees: 0 },
    )

    const net = metrics.gross - metrics.refunds - metrics.fees
    const refundRate = metrics.gross > 0 ? metrics.refunds / metrics.gross : 0

    return {
      success: true,
      fromUnix,
      toUnix,
      currency: this.detectCurrency(txns),
      gross: metrics.gross / 100,
      refunds: metrics.refunds / 100,
      fees: metrics.fees / 100,
      net: net / 100,
      refundRate,
      transactionsCount: txns.length,
      chartData: this.buildChartData(txns),
    }
  }

  async getCampaignProducts(supabase: SupabaseClient, userId: string, campaignId: string) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listProductsByCampaign(token, campaignId)
  }

  async getCampaignPaymentLinks(supabase: SupabaseClient, userId: string, campaignId: string) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listPaymentLinksByCampaign(token, campaignId)
  }

  async getProductPrices(supabase: SupabaseClient, userId: string, productId: string) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listPricesByProduct(token, productId)
  }

  async createCoupon(
    supabase: SupabaseClient,
    userId: string,
    input: z.infer<typeof CreateStripeCouponSchema>,
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.createCoupon(token, {
      ...input,
      metadata: this.withCampaignMetadata(input),
    })
  }

  async getCampaignCoupons(supabase: SupabaseClient, userId: string, campaignId: string) {
    const token = await this.oauth.getAccessToken(supabase, userId)
    return this.stripe.listCouponsByCampaign(token, campaignId)
  }

  async getCampaignOverview(
    supabase: SupabaseClient,
    userId: string,
    input: { campaignId: string; fromUnix?: number; toUnix?: number; orgId?: string | null },
  ) {
    const token = await this.oauth.getAccessToken(supabase, userId, input.orgId)
    const fromUnix = input.fromUnix ?? Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    const toUnix = input.toUnix ?? Math.floor(Date.now() / 1000)

    const list = await this.stripe.listBalanceTransactions(token, fromUnix, toUnix)
    const filtered = (list.data ?? []).filter(
      (txn) => txn.source?.metadata?.campaign_id === input.campaignId,
    )

    const metrics = filtered.reduce(
      (acc, txn) => {
        const category = txn.reporting_category || txn.type
        if (category === 'charge' || txn.type === 'charge') {
          if (txn.amount > 0) acc.gross += txn.amount
        }
        if (category === 'refund' || txn.type === 'refund') {
          acc.refunds += Math.abs(txn.amount)
        }
        if (txn.fee > 0) acc.fees += txn.fee
        if (txn.type === 'stripe_fee') acc.fees += Math.abs(txn.amount)
        return acc
      },
      { gross: 0, refunds: 0, fees: 0 },
    )

    const net = metrics.gross - metrics.refunds - metrics.fees
    const refundRate = metrics.gross > 0 ? metrics.refunds / metrics.gross : 0

    return {
      success: true,
      campaignId: input.campaignId,
      fromUnix,
      toUnix,
      currency: this.detectCurrency(filtered),
      gross: metrics.gross / 100,
      refunds: metrics.refunds / 100,
      fees: metrics.fees / 100,
      net: net / 100,
      refundRate,
      transactionsCount: filtered.length,
      chartData: this.buildChartData(filtered),
      topProducts: this.aggregateTopProducts(filtered),
    }
  }

  private aggregateTopProducts(
    txns: StripeBalanceTransaction[],
  ): Array<{ name: string; revenue: number }> {
    const byLabel = new Map<string, number>()
    for (const txn of txns) {
      const category = txn.reporting_category || txn.type
      if ((category !== 'charge' && txn.type !== 'charge') || txn.amount <= 0) continue
      const meta = txn.source?.metadata ?? {}
      const label = meta.product_name || meta.product_id || txn.source?.description || 'Other'
      const add = txn.amount / 100
      byLabel.set(label, (byLabel.get(label) ?? 0) + add)
    }
    return Array.from(byLabel.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }

  private buildChartData(
    txns: StripeBalanceTransaction[],
  ): Array<{ date: string; gross: number; refunds: number; fees: number; net: number }> {
    const byDay = new Map<string, { gross: number; refunds: number; fees: number }>()
    for (const txn of txns) {
      const day = new Date(txn.created * 1000).toISOString().slice(0, 10)
      const bucket = byDay.get(day) ?? { gross: 0, refunds: 0, fees: 0 }
      const category = txn.reporting_category || txn.type
      if ((category === 'charge' || txn.type === 'charge') && txn.amount > 0)
        bucket.gross += txn.amount
      if (category === 'refund' || txn.type === 'refund') bucket.refunds += Math.abs(txn.amount)
      if (txn.fee > 0) bucket.fees += txn.fee
      if (txn.type === 'stripe_fee') bucket.fees += Math.abs(txn.amount)
      byDay.set(day, bucket)
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, m]) => ({
        date,
        gross: m.gross / 100,
        refunds: m.refunds / 100,
        fees: m.fees / 100,
        net: (m.gross - m.refunds - m.fees) / 100,
      }))
  }

  private detectCurrency(transactions: StripeBalanceTransaction[]): string {
    return transactions[0]?.currency ?? 'usd'
  }

  private withCampaignMetadata(input: {
    campaign_id?: string
    campaign_name?: string
    metadata?: Record<string, string>
  }): Record<string, string> | undefined {
    const base = input.metadata ?? {}
    if (!input.campaign_id && !input.campaign_name) {
      return Object.keys(base).length > 0 ? base : undefined
    }
    return {
      ...base,
      ...(input.campaign_id ? { campaign_id: input.campaign_id } : {}),
      ...(input.campaign_name ? { campaign_name: input.campaign_name } : {}),
    }
  }
}
