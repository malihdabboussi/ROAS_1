export interface SubscriptionPlan {
  id: string
  slug: string
  name: string
  price_amount: number
  interval: string
  base_credits: number
  stripe_price_id: string | null
  stripe_test_price_id: string | null
  is_active: boolean
}

export interface CreditPack {
  id: string
  name: string
  credits: number
  price_amount: number | null
  slug: string
  stripe_price_id: string | null
  stripe_test_price_id: string | null
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  current_period_start: string | null
  current_period_end: string | null
}

export interface AddonProduct {
  id: string
  slug: string
  stripe_price_id: string | null
  stripe_test_price_id: string | null
}
