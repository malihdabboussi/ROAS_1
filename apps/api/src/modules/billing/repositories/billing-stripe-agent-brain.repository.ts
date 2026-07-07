import { Injectable } from '@nestjs/common'
import type { AddonProduct } from '../services/stripe-service.types'
import { BillingStripeCustomerRepository } from './billing-stripe-customer.repository'

type BillingDbResult<T = any> = Promise<{ data: T | null; error: any }>

const BRAIN_TABLES = [
  'ns_sk_entries',
  'ns_sk_sources',
  'ns_sk_gaps',
  'ns_sk_evolution',
  'ns_sk_curriculum',
  'ns_memories',
  'ns_snapshots',
  'ns_narrative_pages',
  'ns_content_hashes',
  'ns_memory_sessions',
  'ns_pending_captures',
  'ns_brain_log',
]

@Injectable()
export class BillingStripeAgentBrainRepository {
  constructor(private readonly customerRepository: BillingStripeCustomerRepository) {}

  async findActiveUserAddon(
    userId: string,
    agentId: string,
  ): BillingDbResult<{
    id: string
    brain_id: string | null
    stripe_subscription_item_id: string | null
  }> {
    return await this.customerRepository
      .getClient()
      .from('user_addons')
      .select('id, brain_id, stripe_subscription_item_id')
      .eq('user_id', userId)
      .eq('addon_slug', 'agent-brain')
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .maybeSingle()
  }

  async findUserRole(userId: string): BillingDbResult<{ role: string | null }> {
    return await this.customerRepository
      .getClient()
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle<{ role: string | null }>()
  }

  async createUserBrain(userId: string, agentId: string): BillingDbResult<{ id: string }> {
    return await this.customerRepository
      .getClient()
      .from('ns_brains')
      .insert({
        owner_id: userId,
        name: `${agentId} Brain`,
        agent_id: agentId,
        is_default: false,
      })
      .select('id')
      .single<{ id: string }>()
  }

  async insertUserAddon(payload: Record<string, unknown>): BillingDbResult {
    return await this.customerRepository.getClient().from('user_addons').insert(payload)
  }

  async findActiveAddonProduct(slug: string): BillingDbResult<AddonProduct> {
    return await this.customerRepository
      .getClient()
      .from('addon_products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single<AddonProduct>()
  }

  async findActiveUserSubscription(
    userId: string,
  ): BillingDbResult<{ stripe_subscription_id: string }> {
    return await this.customerRepository
      .getClient()
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .not('stripe_subscription_id', 'is', null)
      .maybeSingle<{ stripe_subscription_id: string }>()
  }

  async findActiveOrgAddon(
    orgId: string,
    agentId: string,
  ): BillingDbResult<{
    id: string
    brain_id: string | null
    stripe_subscription_item_id: string | null
  }> {
    return await this.customerRepository
      .getClient()
      .from('org_addons')
      .select('id, brain_id, stripe_subscription_item_id')
      .eq('org_id', orgId)
      .eq('addon_slug', 'agent-brain')
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .maybeSingle()
  }

  async createOrgBrain(
    orgId: string,
    ownerId: string,
    agentId: string,
  ): BillingDbResult<{ id: string }> {
    return await this.customerRepository
      .getClient()
      .from('ns_brains')
      .insert({
        org_id: orgId,
        owner_id: ownerId,
        name: `${agentId} Brain`,
        agent_id: agentId,
        scope: 'agent',
        is_default: false,
      })
      .select('id')
      .single<{ id: string }>()
  }

  async insertOrgAddon(payload: Record<string, unknown>): BillingDbResult {
    return await this.customerRepository.getClient().from('org_addons').insert(payload)
  }

  async findActiveOrgSubscription(
    orgId: string,
  ): BillingDbResult<{ stripe_subscription_id: string }> {
    return await this.customerRepository
      .getClient()
      .from('org_subscriptions')
      .select('stripe_subscription_id')
      .eq('org_id', orgId)
      .in('status', ['active', 'trialing', 'past_due'])
      .not('stripe_subscription_id', 'is', null)
      .maybeSingle<{ stripe_subscription_id: string }>()
  }

  async findUserAddonForCancellation(
    userId: string,
    agentId: string,
  ): BillingDbResult<{
    id: string
    stripe_subscription_item_id: string | null
    brain_id: string | null
  }> {
    return await this.customerRepository
      .getClient()
      .from('user_addons')
      .select('id, stripe_subscription_item_id, brain_id')
      .eq('user_id', userId)
      .eq('addon_slug', 'agent-brain')
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .maybeSingle()
  }

  async findCancelableUserAddon(
    userId: string,
    agentId: string,
    orgId?: string,
  ): BillingDbResult<{
    id: string
    stripe_subscription_item_id: string | null
    brain_id: string | null
    status: string
  }> {
    let query = this.customerRepository
      .getClient()
      .from('user_addons')
      .select('id, stripe_subscription_item_id, brain_id, status')
      .eq('user_id', userId)
      .eq('addon_slug', 'agent-brain')
      .eq('agent_id', agentId)
      .in('status', ['active', 'canceling'])

    if (orgId) {
      query = query.eq('org_id', orgId)
    }

    return await query.maybeSingle()
  }

  async markUserAddonCanceling(addonId: string, canceledAt: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('user_addons')
      .update({ status: 'canceling', canceled_at: canceledAt })
      .eq('id', addonId)
  }

  async findBrainForAgentScope(
    userId: string,
    agentId: string,
    orgId?: string,
  ): BillingDbResult<{ id: string }> {
    let query = this.customerRepository
      .getClient()
      .from('ns_brains')
      .select('id')
      .eq('agent_id', agentId)
      .not('status', 'eq', 'deleted')

    query = orgId ? query.eq('org_id', orgId) : query.eq('owner_id', userId).is('org_id', null)
    return await query.maybeSingle<{ id: string }>()
  }

  async markBrainPendingDeletion(
    brainId: string,
    pendingDeletionAt: string,
    excludeDeleted = false,
  ): BillingDbResult {
    let query = this.customerRepository
      .getClient()
      .from('ns_brains')
      .update({
        status: 'pending_deletion',
        pending_deletion_at: pendingDeletionAt,
      })
      .eq('id', brainId)

    if (excludeDeleted) {
      query = query.not('status', 'eq', 'deleted')
    }

    return await query
  }

  async listExpiredBrains(nowIso: string): BillingDbResult<{ id: string }[]> {
    return await this.customerRepository
      .getClient()
      .from('ns_brains')
      .select('id')
      .eq('status', 'pending_deletion')
      .lte('pending_deletion_at', nowIso)
      .not('agent_id', 'is', null)
      .limit(100)
  }

  async deleteBrainData(brainId: string): Promise<void> {
    for (const table of BRAIN_TABLES) {
      await this.customerRepository.getClient().from(table).delete().eq('brain_id', brainId)
    }
  }

  async markBrainDeleted(brainId: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('ns_brains')
      .update({ status: 'deleted', pending_deletion_at: null })
      .eq('id', brainId)
  }

  async cancelUserAddonsByBrainId(brainId: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('user_addons')
      .update({ status: 'canceled' })
      .eq('brain_id', brainId)
  }
}
