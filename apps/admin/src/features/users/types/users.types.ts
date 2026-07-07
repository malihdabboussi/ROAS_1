export type UserRow = {
  id: string
  email: string | null
  role: string | null
  display_name: string | null
  created_at: string | null
  updated_at: string | null
  fly_machine_id: string | null
  total_tokens: number
  total_credits: number
  credits_remaining?: number
  total_cost: number
  subscription_plan: string | null
  subscription_status: string | null
  subscription_end: string | null
}

export type UserMetrics = {
  totalUsers: number
  newUsersLast7Days: number
  newUsersLast30Days: number
  activeUsersLast7Days: number
}

export type UsersResponse = {
  metrics: UserMetrics
  users: UserRow[]
}
