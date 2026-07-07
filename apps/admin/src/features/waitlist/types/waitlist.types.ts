export type WaitlistEntryRow = {
  id: string
  email: string
  name: string | null
  status: string
  heard_from: string | null
  use_case: string | null
  created_at: string
  invited_at: string | null
  invite_sent_at: string | null
  invite_redeemed_at: string | null
  invite_redeemed_user_id: string | null
}

export type WaitlistResponse = {
  metrics: {
    total: number
    pending: number
    invited: number
    registered: number
    provisionedMachines: number
    machineCapacity: number
  }
  entries: WaitlistEntryRow[]
}

export type InviteCodeRow = {
  id: string
  code: string
  label: string | null
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export type CreateInviteCodeResponse = {
  code: string
  inviteUrl: string
  expiresAt: string | null
}
