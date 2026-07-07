import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface WaitlistEntryInput {
  email: string
  name?: string | null
  source?: string | null
  notes?: string | null
  heard_from?: string | null
  use_case?: string | null
  status: string
}

export interface DirectInviteCodeRow {
  id: string
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
}

export interface SubscriptionPlanPriceRow {
  id: string
  slug: string
  stripe_price_id: string | null
  stripe_test_price_id: string | null
}

export interface FastTrackPurchaseRow {
  id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
}

@Injectable()
export class WaitlistRepository {
  private readonly supabase: SupabaseClient

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL')
    const serviceKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY')
    this.supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  async findWaitlistEntryByEmail(
    email: string,
  ): Promise<{ id: string; status?: string | null } | null> {
    const { data } = await this.supabase
      .from('waitlist_entries')
      .select('id, status')
      .eq('email', email)
      .maybeSingle()
    return data as { id: string; status?: string | null } | null
  }

  async insertWaitlistEntry(input: WaitlistEntryInput): Promise<void> {
    const { error } = await this.supabase.from('waitlist_entries').insert(input)
    if (error) throw new Error(error.message)
  }

  async findActiveDirectInviteCode(code: string): Promise<DirectInviteCodeRow | null> {
    const { data, error } = await this.supabase
      .from('direct_invite_codes')
      .select('id, max_uses, uses_count, expires_at, is_active')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) return null
    return data as DirectInviteCodeRow
  }

  async findPendingInvite(codeHash: string, email: string): Promise<{ id: string } | null> {
    const { data, error } = await this.supabase
      .from('waitlist_invites')
      .select('id')
      .eq('code_hash', codeHash)
      .eq('email_normalized', email)
      .is('redeemed_at', null)
      .maybeSingle()

    if (error || !data) return null
    return data as { id: string }
  }

  async createConfirmedUser(email: string, password: string) {
    return this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
  }

  async redeemInviteCode(codeHash: string, email: string, userId: string) {
    return this.supabase.rpc('redeem_invite_code', {
      p_code_hash: codeHash,
      p_email: email,
      p_user_id: userId,
    })
  }

  async deleteUser(userId: string): Promise<void> {
    await this.supabase.auth.admin.deleteUser(userId)
  }

  async signInWithPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  async countWaitlistEntries() {
    return this.supabase.from('waitlist_entries').select('id', { count: 'exact', head: true })
  }

  async findActiveUltraMonthlyPlan(): Promise<SubscriptionPlanPriceRow | null> {
    const { data, error } = await this.supabase
      .from('subscription_plans')
      .select('id, slug, stripe_price_id, stripe_test_price_id')
      .eq('slug', 'ultra-monthly')
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    return data as SubscriptionPlanPriceRow
  }

  async findActiveUltraMonthlyPlanId(): Promise<{ id: string } | null> {
    const { data } = await this.supabase
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'ultra-monthly')
      .eq('is_active', true)
      .single()
    return data as { id: string } | null
  }

  async insertFastTrackPurchase(email: string, sessionId: string): Promise<void> {
    await this.supabase.from('fast_track_purchases').insert({
      email,
      stripe_checkout_session_id: sessionId,
      status: 'pending',
    })
  }

  async findFastTrackStatusBySessionId(
    sessionId: string,
  ): Promise<{ status: string; invite_code: string | null } | null> {
    const { data, error } = await this.supabase
      .from('fast_track_purchases')
      .select('status, invite_code')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle()

    if (error || !data) return null
    return data as { status: string; invite_code: string | null }
  }

  async findPaidFastTrackPurchaseBySessionId(
    sessionId: string,
  ): Promise<FastTrackPurchaseRow | null> {
    const { data } = await this.supabase
      .from('fast_track_purchases')
      .select('id, stripe_customer_id, stripe_subscription_id, status')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('status', 'paid')
      .maybeSingle()
    return data as FastTrackPurchaseRow | null
  }

  async findPaidFastTrackPurchaseByEmail(email: string): Promise<FastTrackPurchaseRow | null> {
    const { data } = await this.supabase
      .from('fast_track_purchases')
      .select('id, stripe_customer_id, stripe_subscription_id, status')
      .eq('email', email)
      .eq('status', 'paid')
      .maybeSingle()
    return data as FastTrackPurchaseRow | null
  }

  async findActiveUserSubscription(userId: string): Promise<{ id: string } | null> {
    const { data } = await this.supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()
    return data as { id: string } | null
  }

  async markFastTrackRedeemed(purchaseId: string, userId: string): Promise<void> {
    await this.supabase
      .from('fast_track_purchases')
      .update({ redeemed_user_id: userId, status: 'redeemed' })
      .eq('id', purchaseId)
  }

  async upsertUserSubscription(input: {
    userId: string
    planId: string
    stripeSubscriptionId: string
    stripeCustomerId: string | null
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
  }): Promise<void> {
    await this.supabase.from('user_subscriptions').upsert(
      {
        user_id: input.userId,
        plan_id: input.planId,
        status: 'active',
        stripe_subscription_id: input.stripeSubscriptionId,
        stripe_customer_id: input.stripeCustomerId,
        current_period_start: input.currentPeriodStart,
        current_period_end: input.currentPeriodEnd,
      },
      { onConflict: 'user_id' },
    )
  }
}
