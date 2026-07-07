/**
 * User-scoped billing mutations and composite reads: promo, agent brain, invoices, subscription flags.
 */

import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RedeemPromoBody } from '../billing-http.types'
import { FREE_BASE_CREDITS } from '../constants/credit-allowances'
import { BillingUserActionsRepository } from '../repositories/billing-user-actions.repository'
import { CreditsService } from './credits.service'
import { StripeService } from './stripe.service'

@Injectable()
export class BillingUserActionsService {
  private readonly logger = new Logger(BillingUserActionsService.name)
  private readonly actionsRepository: BillingUserActionsRepository

  constructor(
    private readonly creditsService: CreditsService,
    private readonly stripeService: StripeService,
    @Optional() actionsRepository?: BillingUserActionsRepository,
  ) {
    this.actionsRepository = actionsRepository ?? new BillingUserActionsRepository()
  }

  async redeemPromo(
    userId: string,
    supabase: SupabaseClient,
    body: RedeemPromoBody,
  ): Promise<{ success: boolean; credits: number }> {
    const code = (body.code ?? '').trim().toUpperCase()
    if (!code) {
      throw new BadRequestException('code is required')
    }

    const { data: promo, error: promoErr } =
      await this.actionsRepository.findActivePromoByCode(supabase, code)

    if (promoErr || !promo) {
      throw new BadRequestException('Invalid or expired promo code')
    }

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      throw new BadRequestException('This promo code has expired')
    }

    if (promo.max_redemptions !== null && promo.current_redemptions >= promo.max_redemptions) {
      throw new BadRequestException('This promo code has reached its redemption limit')
    }

    const { data: existing } = await this.actionsRepository.findPromoRedemption(
      supabase,
      promo.id,
      userId,
    )

    if (existing) {
      throw new BadRequestException('You have already redeemed this promo code')
    }

    const { error: redemptionErr } = await this.actionsRepository.insertPromoRedemption(supabase, {
      promo_code_id: promo.id,
      user_id: userId,
      credits_granted: promo.credits_amount,
    })

    if (redemptionErr) {
      this.logger.error(`Failed to record promo redemption: ${redemptionErr.message}`)
      throw new BadRequestException('Failed to redeem promo code')
    }

    await this.actionsRepository.updatePromoRedemptionCount(
      supabase,
      promo.id,
      promo.current_redemptions + 1,
    )

    await this.actionsRepository.insertCreditPurchase(supabase, {
      user_id: userId,
      credits_purchased: promo.credits_amount,
      amount_paid: 0,
      status: 'completed',
    })

    const { data: promoAllPurchases } =
      await this.actionsRepository.listCompletedCreditPurchases(supabase, userId)

    const totalPurchased =
      promoAllPurchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

    const promoLedgerId = await this.creditsService.resolvePersonalMonthlyUsageLedgerRowId(userId)

    if (promoLedgerId) {
      await this.actionsRepository.updatePersonalUsageTotalPurchased(
        supabase,
        promoLedgerId,
        totalPurchased,
      )
    } else {
      const promoNow = new Date()
      await this.actionsRepository.insertPersonalUsage(supabase, {
        user_id: userId,
        month: promoNow.toISOString().split('T')[0],
        base_allowance: FREE_BASE_CREDITS,
        base_credits_used: 0,
        purchased_credits_used: 0,
        total_credits_used: 0,
        total_credits_purchased: totalPurchased,
        rollover_credits: 0,
      })
    }

    if (promo.grants_role) {
      const profileUpdate: Record<string, unknown> = {
        role: promo.grants_role,
        updated_at: new Date().toISOString(),
      }
      if (promo.grants_role === 'enterprise') {
        profileUpdate.credit_discount_percent = 20
      }
      await this.actionsRepository.updateUserProfile(supabase, userId, profileUpdate)
      this.logger.log(`Promo code ${code} granted role '${promo.grants_role}' to user ${userId}`)
    }

    this.logger.log(
      `Promo code ${code} redeemed by user ${userId}: ${promo.credits_amount} credits`,
    )

    return { success: true, credits: promo.credits_amount }
  }

  async getAgentBrainStatusBatch(
    userId: string,
    supabase: SupabaseClient,
    agentIdsRaw?: string,
    orgId?: string,
  ): Promise<{ statuses: Array<{ agentId: string; hasBrain: boolean; brainId: string | null }> }> {
    if (!agentIdsRaw?.trim()) {
      return { statuses: [] }
    }
    const agentIds = agentIdsRaw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
    if (agentIds.length === 0) return { statuses: [] }

    const trimmedOrgId = orgId?.trim() || null

    if (trimmedOrgId) {
      const { data: brains } = await this.actionsRepository.listOrgAgentBrains(
        supabase,
        trimmedOrgId,
        agentIds,
      )
      const brainMap = new Map((brains ?? []).map((b) => [b.agent_id, b.id]))
      return {
        statuses: agentIds.map((aid) => ({
          agentId: aid,
          hasBrain: brainMap.has(aid),
          brainId: brainMap.get(aid) ?? null,
        })),
      }
    }

    const { data: addons } = await this.actionsRepository.listActiveAgentBrainAddons(
      supabase,
      userId,
      agentIds,
    )

    const addonMap = new Map((addons ?? []).map((a) => [a.agent_id, a.brain_id as string | null]))

    const missingBrainAgentIds = agentIds.filter((aid) => addonMap.has(aid) && !addonMap.get(aid))
    if (missingBrainAgentIds.length > 0) {
      const { data: brains } = await this.actionsRepository.listOwnedAgentBrains(
        supabase,
        userId,
        missingBrainAgentIds,
      )
      for (const b of brains ?? []) {
        addonMap.set(b.agent_id, b.id)
      }
    }

    return {
      statuses: agentIds.map((aid) => ({
        agentId: aid,
        hasBrain: addonMap.has(aid),
        brainId: addonMap.get(aid) ?? null,
      })),
    }
  }

  async getAgentBrainStatus(
    userId: string,
    supabase: SupabaseClient,
    agentId?: string,
    orgId?: string,
  ): Promise<{ hasBrain: boolean; brainId: string | null }> {
    if (!agentId?.trim()) {
      throw new BadRequestException('agentId is required')
    }

    const trimmedAgentId = agentId.trim()
    const trimmedOrgId = orgId?.trim() || null

    if (trimmedOrgId) {
      const { data: brain, error } = await this.actionsRepository.findOrgAgentBrain(
        supabase,
        trimmedOrgId,
        trimmedAgentId,
      )
      if (error) {
        throw new BadRequestException(`Failed to read org agent brain: ${error.message}`)
      }
      if (brain) return { hasBrain: true, brainId: brain.id }
      return { hasBrain: false, brainId: null }
    }

    const { data: row, error } = await this.actionsRepository.findActiveAgentBrainAddon(
      supabase,
      userId,
      trimmedAgentId,
    )

    if (error) {
      throw new BadRequestException(`Failed to read agent brain status: ${error.message}`)
    }

    if (!row) return { hasBrain: false, brainId: null }

    if (!row.brain_id) {
      const { data: brain } = await this.actionsRepository.createUserAgentBrain(
        supabase,
        userId,
        trimmedAgentId,
      )
      if (brain) {
        await this.actionsRepository.updateUserAddonBrainId(supabase, row.id, brain.id)
        return { hasBrain: true, brainId: brain.id }
      }
    }

    return { hasBrain: true, brainId: row.brain_id }
  }

  async getInvoices(
    userId: string,
    supabase: SupabaseClient,
    limitParam?: string,
  ): Promise<{
    invoices: Array<{
      stripe_invoice_id: string
      amount_paid: number
      amount_due: number
      currency: string
      status: string
      invoice_pdf: string | null
      hosted_invoice_url: string | null
      created: number
    }>
  }> {
    const limit = Math.min(parseInt(limitParam ?? '12', 10) || 12, 50)

    const { data: sub } = await this.actionsRepository.findSubscriptionCustomerId(
      supabase,
      userId,
    )

    if (!sub?.stripe_customer_id) {
      return { invoices: [] }
    }

    const invoices = await this.stripeService.listInvoices(sub.stripe_customer_id, limit)
    return { invoices }
  }

  async cancelSubscriptionAtPeriodEnd(
    userId: string,
    supabase: SupabaseClient,
    reason?: string,
  ): Promise<{ success: boolean; periodEnd?: string }> {
    const { data: sub } = await this.actionsRepository.findSubscriptionForCancellation(
      supabase,
      userId,
    )

    if (!sub?.stripe_subscription_id) {
      throw new BadRequestException('No active subscription found')
    }

    const result = await this.stripeService.cancelSubscription(sub.stripe_subscription_id)

    await this.actionsRepository.updateSubscriptionCancellation(supabase, userId, {
      cancel_at_period_end: true,
      cancellation_reason: reason ?? null,
    })

    return {
      success: true,
      periodEnd: result.periodEnd,
    }
  }

  async reactivateSubscription(
    userId: string,
    supabase: SupabaseClient,
  ): Promise<{ success: boolean }> {
    const { data: sub } = await this.actionsRepository.findSubscriptionStripeId(
      supabase,
      userId,
    )

    if (!sub?.stripe_subscription_id) {
      throw new BadRequestException('No active subscription found')
    }

    await this.stripeService.reactivateSubscription(sub.stripe_subscription_id)

    await this.actionsRepository.updateSubscriptionCancellation(supabase, userId, {
      cancel_at_period_end: false,
      cancellation_reason: null,
    })

    return { success: true }
  }
}
