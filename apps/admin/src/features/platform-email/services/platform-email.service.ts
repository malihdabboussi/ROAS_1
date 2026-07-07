import { adminGet, adminPost } from '@/lib/api/admin-client'
import type { PlatformEmailGetResponse } from '../types/platform-email.types'

export async function fetchPlatformEmail(): Promise<PlatformEmailGetResponse> {
  return adminGet<PlatformEmailGetResponse>('platform-email')
}

export async function setPlatformDomain(body: { domain: string; subdomain?: string }) {
  return adminPost<{ config: unknown; dnsRecords: unknown }>('platform-email/domain', body)
}

export async function verifyPlatformDomain() {
  return adminPost<{ config: unknown; allValid: boolean; records: unknown }>(
    'platform-email/verify-domain',
    {},
  )
}

export async function setPlatformSender(body: {
  email: string
  name: string
  replyTo?: string
  address: string
  city: string
  country: string
  state?: string
  zip?: string
}) {
  return adminPost<{ config: unknown }>('platform-email/sender', body)
}

export async function syncPlatformSender() {
  return adminPost<{ config: unknown; senderVerified: boolean }>('platform-email/sync-sender', {})
}
