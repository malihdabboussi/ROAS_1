export type AdminUserRow = {
  id: string
  email: string | null
  role: string | null
  display_name: string | null
  created_at: string | null
  updated_at: string | null
  fly_machine_id: string | null
  total_tokens: number
  total_credits: number
  credits_remaining: number
  total_cost: number
  subscription_plan: string | null
  subscription_status: string | null
  subscription_end: string | null
}

export type AdminOrgRow = {
  id: string
  name: string | null
  slug: string | null
  account_type: string | null
  status: string | null
  owner_id: string | null
  owner_email: string | null
  owner_display_name: string | null
  created_at: string | null
  updated_at: string | null
  total_tokens: number
  total_credits: number
  credits_remaining: number
  total_cost: number
  subscription_plan: string | null
  subscription_status: string | null
  subscription_end: string | null
}
