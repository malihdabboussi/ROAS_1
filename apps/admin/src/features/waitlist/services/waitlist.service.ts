import { adminDelete, adminGet, adminPatch, adminPost } from '@/lib/api/admin-client'
import type {
  CreateInviteCodeResponse,
  InviteCodeRow,
  WaitlistResponse,
} from '../types/waitlist.types'

export async function fetchWaitlist(): Promise<WaitlistResponse> {
  return adminGet<WaitlistResponse>('waitlist')
}

export async function sendInvite(entryId: string): Promise<{ success: boolean; inviteId: string }> {
  return adminPost<{ success: boolean; inviteId: string }>(`waitlist/${entryId}/invite`, {})
}

export async function fetchInviteCodes(): Promise<InviteCodeRow[]> {
  return adminGet<InviteCodeRow[]>('invite-codes')
}

export async function createInviteCode(opts?: {
  label?: string
  maxUses?: number
  expiresInDays?: number
}): Promise<CreateInviteCodeResponse> {
  return adminPost<CreateInviteCodeResponse>('invite-codes', opts ?? {})
}

export async function revokeInviteCode(id: string): Promise<{ success: boolean }> {
  return adminPatch<{ success: boolean }>(`invite-codes/${id}/revoke`, {})
}

export async function deleteInviteCode(id: string): Promise<{ success: boolean }> {
  return adminDelete<{ success: boolean }>(`invite-codes/${id}`)
}
