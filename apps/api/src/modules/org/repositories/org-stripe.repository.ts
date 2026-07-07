import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface OrgStripePriceRow {
  stripe_price_id?: string | null
  stripe_test_price_id?: string | null
  [key: string]: unknown
}

export interface OrgCreditPackRow extends OrgStripePriceRow {
  credits?: number | null
}

type QueryResponse<T> = {
  data: T | null
  error: { message: string } | null
}

@Injectable()
export class OrgStripeRepository {
  async findOrgCustomerId(supabase: SupabaseClient, orgId: string): Promise<string | null> {
    const { data } = await supabase
      .from('org_subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', orgId)
      .maybeSingle<{ stripe_customer_id: string | null }>()

    return data?.stripe_customer_id ?? null
  }

  async findExistingOrgCustomerId(supabase: SupabaseClient, orgId: string): Promise<string | null> {
    const { data } = await supabase
      .from('org_subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', orgId)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle<{ stripe_customer_id: string | null }>()

    return data?.stripe_customer_id ?? null
  }

  async findOrgName(supabase: SupabaseClient, orgId: string): Promise<string | null> {
    const { data } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single<{ name: string | null }>()

    return data?.name ?? null
  }

  async upsertOrgCustomer(
    supabase: SupabaseClient,
    orgId: string,
    customerId: string,
  ): Promise<QueryResponse<unknown>> {
    return await supabase.from('org_subscriptions').upsert(
      { org_id: orgId, stripe_customer_id: customerId, status: 'active' },
      { onConflict: 'org_id' },
    )
  }

  async findActivePlanBySlug(
    supabase: SupabaseClient,
    slug: string,
  ): Promise<OrgStripePriceRow | null> {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single<OrgStripePriceRow>()

    return data ?? null
  }

  async findActiveCreditPackBySlug(
    supabase: SupabaseClient,
    packId: string,
  ): Promise<OrgCreditPackRow | null> {
    const { data } = await supabase
      .from('credit_packs')
      .select('*')
      .eq('slug', packId)
      .eq('is_active', true)
      .single<OrgCreditPackRow>()

    return data ?? null
  }
}
