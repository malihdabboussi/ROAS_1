import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class MetaEligibilityRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async findUserRole(userId: string): Promise<string> {
    const { data } = await this.svc.client
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    return String(data?.role ?? '')
  }

  async findOrgSubscriptionPlanId(orgId: string): Promise<string | null> {
    const { data } = await this.svc.client
      .from('org_subscriptions')
      .select('plan_id, status')
      .eq('org_id', orgId)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()
    return (data?.plan_id as string | null | undefined) ?? null
  }

  async findUserSubscriptionPlanId(userId: string): Promise<string | null> {
    const { data } = await this.svc.client
      .from('user_subscriptions')
      .select('plan_id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()
    return (data?.plan_id as string | null | undefined) ?? null
  }

  async findPlanSlug(planId: string): Promise<string> {
    const { data } = await this.svc.client
      .from('subscription_plans')
      .select('slug')
      .eq('id', planId)
      .maybeSingle()
    return String(data?.slug ?? '')
  }
}
