export type StripeOAuthTokenResponse = {
  access_token: string
  token_type: string
  scope: string
  livemode: boolean
  stripe_user_id: string
  stripe_publishable_key: string
  refresh_token?: string
}

export type StripeUserIntegration = {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: 'pending' | 'connected' | 'error' | 'disconnected'
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  connected_at: string | null
  metadata: {
    scope?: string
    livemode?: boolean
    stripe_user_id?: string
    stripe_publishable_key?: string
  } | null
}

export type StripeBalanceTransaction = {
  id: string
  amount: number
  fee: number
  net: number
  currency: string
  type: string
  reporting_category?: string
  created: number
  source?: {
    id?: string
    object?: string
    description?: string
    metadata?: Record<string, string>
  }
}

export type StripeProduct = {
  id: string
  object: 'product'
  name: string
  description: string | null
  active: boolean
  created: number
  metadata: Record<string, string>
}

export type StripePrice = {
  id: string
  object: 'price'
  product: string
  currency: string
  unit_amount: number | null
  recurring: {
    interval: 'day' | 'week' | 'month' | 'year'
    interval_count: number
  } | null
  nickname: string | null
  active: boolean
  created: number
  metadata: Record<string, string>
}

export type StripePaymentLink = {
  id: string
  object: 'payment_link'
  url: string
  active: boolean
  metadata: Record<string, string>
  line_items?: {
    data: Array<{
      id: string
      price: StripePrice | null
      quantity: number
    }>
  }
}

export type StripeCharge = {
  id: string
  object: 'charge'
  amount: number
  amount_refunded: number
  currency: string
  status: string
  paid: boolean
  refunded: boolean
  customer: string | null
  description: string | null
  invoice: string | null
  payment_intent: string | null
  created: number
  metadata: Record<string, string>
}

export type StripeCustomer = {
  id: string
  object: 'customer'
  name: string | null
  email: string | null
  phone: string | null
  currency: string | null
  created: number
  subscriptions?: { data: StripeSubscription[] }
  metadata: Record<string, string>
}

export type StripeSubscription = {
  id: string
  object: 'subscription'
  customer: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  ended_at: number | null
  start_date: number
  created: number
  items: { data: Array<{ id: string; price: StripePrice }> }
  metadata: Record<string, string>
}

export type StripeInvoice = {
  id: string
  object: 'invoice'
  customer: string
  subscription: string | null
  status: string
  amount_due: number
  amount_paid: number
  amount_remaining: number
  currency: string
  period_start: number
  period_end: number
  created: number
  metadata: Record<string, string>
}

export type StripeCoupon = {
  id: string
  object: 'coupon'
  name: string | null
  percent_off: number | null
  amount_off: number | null
  currency: string | null
  duration: 'once' | 'forever' | 'repeating'
  duration_in_months: number | null
  max_redemptions: number | null
  times_redeemed: number
  redeem_by: number | null
  valid: boolean
  created: number
  metadata: Record<string, string>
}
