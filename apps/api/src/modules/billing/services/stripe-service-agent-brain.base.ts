import { StripeCheckoutBase } from './stripe-service-checkout.base'

export abstract class StripeAgentBrainBase extends StripeCheckoutBase {
  /**
   * Add the recurring Agent Brain add-on ($10/mo) to the user's existing subscription.
   * This is applied as an extra Stripe subscription item with proration.
   */
  async addAgentBrainAddon(
    userId: string,
    email: string,
    agentId: string,
  ): Promise<{
    charged: boolean
    brainId: string
    subscriptionItemId: string
    url?: string
    sessionId?: string
  }> {
    if (!agentId?.trim()) {
      throw new Error('agentId is required')
    }

    const trimmedAgentId = agentId.trim()

    // Prevent duplicate active add-on for the same agent
    const { data: existingAddon } = await this.stripeAgentBrainRepository.findActiveUserAddon(
      userId,
      trimmedAgentId,
    )

    if (existingAddon) {
      return {
        charged: true,
        brainId: existingAddon.brain_id ?? '',
        subscriptionItemId: existingAddon.stripe_subscription_item_id ?? '',
      }
    }

    // Admin/enterprise users get free brains — skip Stripe entirely
    const { data: userProfile } = await this.stripeAgentBrainRepository.findUserRole(userId)

    if (userProfile?.role === 'admin' || userProfile?.role === 'enterprise') {
      const { data: freeBrain, error: freeBrainErr } =
        await this.stripeAgentBrainRepository.createUserBrain(userId, trimmedAgentId)
      if (freeBrainErr || !freeBrain) {
        throw new Error(`Failed to create free agent brain: ${freeBrainErr?.message ?? 'unknown'}`)
      }

      await this.stripeAgentBrainRepository.insertUserAddon({
        user_id: userId,
        addon_slug: 'agent-brain',
        stripe_subscription_item_id: null,
        brain_id: freeBrain.id,
        agent_id: trimmedAgentId,
        status: 'active',
      })

      this.logger.log(
        `Free agent brain created for ${userProfile.role} user ${userId}: agent=${trimmedAgentId}`,
      )
      return { charged: true, brainId: freeBrain.id, subscriptionItemId: 'free' }
    }

    const { data: addon } =
      await this.stripeAgentBrainRepository.findActiveAddonProduct('agent-brain')

    if (!addon) {
      throw new Error('Agent Brain add-on product is not configured')
    }

    const addonPriceId = this.getPriceId(addon)
    if (!addonPriceId) {
      throw new Error('Agent Brain add-on missing Stripe price ID')
    }

    const customerId = await this.findOrCreateCustomerId(userId, email)

    // Check for active base subscription to attach as subscription item.
    const { data: currentSub } =
      await this.stripeAgentBrainRepository.findActiveUserSubscription(userId)

    const needsCheckout = !currentSub?.stripe_subscription_id

    if (!needsCheckout) {
      const customer = await this.stripe.customers.retrieve(customerId)
      const defaultPaymentMethod =
        !customer.deleted && 'invoice_settings' in customer
          ? customer.invoice_settings?.default_payment_method
          : null

      if (!defaultPaymentMethod) {
        // No payment method — fall through to checkout
      } else {
        const stripeSub = await this.stripe.subscriptions.retrieve(
          currentSub.stripe_subscription_id,
        )
        if (stripeSub && stripeSub.status !== 'canceled') {
          const existingItems = stripeSub.items.data.map((item) => ({
            id: item.id,
            price: item.price.id,
          }))
          const updatedSub = await this.stripe.subscriptions.update(
            currentSub.stripe_subscription_id,
            {
              items: [...existingItems, { price: addonPriceId, quantity: 1 }],
              proration_behavior: 'always_invoice',
              metadata: {
                user_id: userId,
                addon_slug: 'agent-brain',
                agent_id: trimmedAgentId,
              },
            },
          )

          const existingItemIds = new Set(stripeSub.items.data.map((i) => i.id))
          const addedItem = updatedSub.items.data.find(
            (i) => i.price?.id === addonPriceId && !existingItemIds.has(i.id),
          )

          if (!addedItem) {
            throw new Error('Failed to attach add-on subscription item')
          }

          const { data: brain, error: brainErr } =
            await this.stripeAgentBrainRepository.createUserBrain(userId, trimmedAgentId)
          if (brainErr || !brain) {
            throw new Error(`Failed to create agent brain: ${brainErr?.message ?? 'unknown'}`)
          }

          const { error: addonInsertErr } = await this.stripeAgentBrainRepository.insertUserAddon({
            user_id: userId,
            addon_slug: 'agent-brain',
            stripe_subscription_item_id: addedItem.id,
            brain_id: brain.id,
            agent_id: trimmedAgentId,
            status: 'active',
          })
          if (addonInsertErr) {
            throw new Error(`Failed to persist add-on: ${addonInsertErr.message}`)
          }

          return { charged: true, brainId: brain.id, subscriptionItemId: addedItem.id }
        }
      }
    }

    // No active subscription or no payment method — create a Stripe Checkout session.
    const appUrl = process.env.APP_URL
    if (!appUrl) throw new Error('APP_URL env var is required')
    const successUrl = `${appUrl}/studio?brain=activated&agentId=${encodeURIComponent(trimmedAgentId)}`
    const cancelUrl = `${appUrl}/studio?canceled=true`

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: addonPriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        type: 'agent_brain',
        agent_id: trimmedAgentId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          type: 'agent_brain',
          agent_id: trimmedAgentId,
        },
      },
      payment_method_collection: 'always',
    })

    this.logger.log(
      `[Agent Brain Checkout] Created session for user ${userId}, agent=${trimmedAgentId}`,
    )

    return {
      charged: false,
      brainId: '',
      subscriptionItemId: '',
      url: session.url ?? '',
      sessionId: session.id,
    }
  }

  /**
   * Org-scoped Agent Brain add-on. Mirrors `addAgentBrainAddon` but the brain row
   * is created with `org_id` so it is visible inside the org's brain context, and
   * the add-on is recorded in `org_addons` instead of `user_addons`.
   *
   * - Admin/enterprise users (the caller's profile role) get the brain free.
   * - Otherwise we attach the recurring item to the existing org Stripe subscription.
   */
  async addOrgAgentBrainAddon(
    orgId: string,
    userId: string,
    email: string,
    agentId: string,
  ): Promise<{
    charged: boolean
    brainId: string
    subscriptionItemId: string
    url?: string
    sessionId?: string
  }> {
    if (!orgId?.trim()) throw new Error('orgId is required')
    if (!agentId?.trim()) throw new Error('agentId is required')

    const trimmedOrgId = orgId.trim()
    const trimmedAgentId = agentId.trim()

    const { data: existingAddon } = await this.stripeAgentBrainRepository.findActiveOrgAddon(
      trimmedOrgId,
      trimmedAgentId,
    )

    if (existingAddon) {
      return {
        charged: true,
        brainId: existingAddon.brain_id ?? '',
        subscriptionItemId: existingAddon.stripe_subscription_item_id ?? '',
      }
    }

    const { data: userProfile } = await this.stripeAgentBrainRepository.findUserRole(userId)

    if (userProfile?.role === 'admin' || userProfile?.role === 'enterprise') {
      const { data: freeBrain, error: freeBrainErr } =
        await this.stripeAgentBrainRepository.createOrgBrain(trimmedOrgId, userId, trimmedAgentId)
      if (freeBrainErr || !freeBrain) {
        throw new Error(
          `Failed to create free org agent brain: ${freeBrainErr?.message ?? 'unknown'}`,
        )
      }

      await this.stripeAgentBrainRepository.insertOrgAddon({
        org_id: trimmedOrgId,
        addon_slug: 'agent-brain',
        stripe_subscription_item_id: null,
        brain_id: freeBrain.id,
        agent_id: trimmedAgentId,
        status: 'active',
      })

      this.logger.log(
        `Free org agent brain created for ${userProfile.role} user ${userId}: org=${trimmedOrgId}, agent=${trimmedAgentId}`,
      )
      return { charged: true, brainId: freeBrain.id, subscriptionItemId: 'free' }
    }

    const { data: addon } =
      await this.stripeAgentBrainRepository.findActiveAddonProduct('agent-brain')

    if (!addon) {
      throw new Error('Agent Brain add-on product is not configured')
    }

    const addonPriceId = this.getPriceId(addon)
    if (!addonPriceId) {
      throw new Error('Agent Brain add-on missing Stripe price ID')
    }

    const { data: orgSub } =
      await this.stripeAgentBrainRepository.findActiveOrgSubscription(trimmedOrgId)

    if (!orgSub?.stripe_subscription_id) {
      throw new Error(
        'Organization has no active subscription. Subscribe the org to a plan first to add an agent brain.',
      )
    }

    const stripeSub = await this.stripe.subscriptions.retrieve(orgSub.stripe_subscription_id)
    if (stripeSub.status === 'canceled') {
      throw new Error('Organization subscription is canceled')
    }

    const existingItems = stripeSub.items.data.map((item) => ({
      id: item.id,
      price: item.price.id,
    }))
    const updatedSub = await this.stripe.subscriptions.update(orgSub.stripe_subscription_id, {
      items: [...existingItems, { price: addonPriceId, quantity: 1 }],
      proration_behavior: 'always_invoice',
      metadata: {
        org_id: trimmedOrgId,
        addon_slug: 'agent-brain',
        agent_id: trimmedAgentId,
        added_by_user_id: userId,
      },
    })

    const existingItemIds = new Set(stripeSub.items.data.map((i) => i.id))
    const addedItem = updatedSub.items.data.find(
      (i) => i.price?.id === addonPriceId && !existingItemIds.has(i.id),
    )
    if (!addedItem) {
      throw new Error('Failed to attach add-on subscription item')
    }

    const { data: brain, error: brainErr } = await this.stripeAgentBrainRepository.createOrgBrain(
      trimmedOrgId,
      userId,
      trimmedAgentId,
    )
    if (brainErr || !brain) {
      throw new Error(`Failed to create org agent brain: ${brainErr?.message ?? 'unknown'}`)
    }

    const { error: addonInsertErr } = await this.stripeAgentBrainRepository.insertOrgAddon({
      org_id: trimmedOrgId,
      addon_slug: 'agent-brain',
      stripe_subscription_item_id: addedItem.id,
      brain_id: brain.id,
      agent_id: trimmedAgentId,
      status: 'active',
    })
    if (addonInsertErr) {
      throw new Error(`Failed to persist org add-on: ${addonInsertErr.message}`)
    }

    this.logger.log(
      `Org agent brain attached to subscription for org ${trimmedOrgId}: agent=${trimmedAgentId}, item=${addedItem.id}`,
    )
    return { charged: true, brainId: brain.id, subscriptionItemId: addedItem.id }
  }

  async cancelAgentBrainAddon(
    userId: string,
    agentId: string,
  ): Promise<{ canceled: true; deletionAt: string | null }> {
    const { data: addon, error: addonErr } =
      await this.stripeAgentBrainRepository.findUserAddonForCancellation(userId, agentId)

    if (addonErr) throw new Error(`Failed to load addon: ${addonErr.message}`)
    if (!addon) throw new Error('Active agent brain add-on not found')

    if (addon.stripe_subscription_item_id) {
      await this.stripe.subscriptionItems.del(addon.stripe_subscription_item_id, {
        proration_behavior: 'always_invoice',
      })
    }

    const canceledAt = new Date().toISOString()
    const deletionAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { error: addonUpdateErr } = await this.stripeAgentBrainRepository.markUserAddonCanceling(
      addon.id,
      canceledAt,
    )
    if (addonUpdateErr) throw new Error(`Failed to update add-on status: ${addonUpdateErr.message}`)

    if (addon.brain_id) {
      const { error: brainErr } = await this.stripeAgentBrainRepository.markBrainPendingDeletion(
        addon.brain_id,
        deletionAt,
      )
      if (brainErr) throw new Error(`Failed to schedule brain deletion: ${brainErr.message}`)
    }

    return { canceled: true, deletionAt: addon.brain_id ? deletionAt : null }
  }

  /**
   * Internal agent-brain cancel used by the fire flow. Idempotent, does not
   * throw when the addon or brain row is already gone.
   *
   * 1. Cancels the Stripe subscription item (if present).
   * 2. Marks user_addons.status = 'canceling'.
   * 3. Marks ns_brains.status = 'pending_deletion' with a 14-day grace window.
   *
   * Returns whether a brain was scheduled for deletion so callers can log it.
   */
  async cancelAgentBrainAddonInternal(
    userId: string,
    agentId: string,
    orgId?: string | null,
  ): Promise<{ canceled: boolean; brain_id: string | null; deletion_at: string | null }> {
    if (!agentId?.trim()) return { canceled: false, brain_id: null, deletion_at: null }

    const { data: addon, error: addonErr } =
      await this.stripeAgentBrainRepository.findCancelableUserAddon(
        userId,
        agentId,
        orgId ?? undefined,
      )
    if (addonErr) throw new Error(`Failed to load addon: ${addonErr.message}`)

    const canceledAt = new Date().toISOString()
    const deletionAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    if (addon?.stripe_subscription_item_id) {
      try {
        await this.stripe.subscriptionItems.del(addon.stripe_subscription_item_id, {
          proration_behavior: 'always_invoice',
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown Stripe error'
        this.logger.warn(
          `Stripe subscription item ${addon.stripe_subscription_item_id} already gone: ${msg}`,
        )
      }
    }

    if (addon && addon.status === 'active') {
      await this.stripeAgentBrainRepository.markUserAddonCanceling(addon.id, canceledAt)
    }

    let brainId: string | null = addon?.brain_id ?? null
    if (!brainId) {
      const { data: brain } = await this.stripeAgentBrainRepository.findBrainForAgentScope(
        userId,
        agentId,
        orgId ?? undefined,
      )
      brainId = brain?.id ?? null
    }

    if (brainId) {
      const { error: brainErr } = await this.stripeAgentBrainRepository.markBrainPendingDeletion(
        brainId,
        deletionAt,
        true,
      )
      if (brainErr) throw new Error(`Failed to schedule brain deletion: ${brainErr.message}`)
    }

    return {
      canceled: !!addon,
      brain_id: brainId,
      deletion_at: brainId ? deletionAt : null,
    }
  }
}
