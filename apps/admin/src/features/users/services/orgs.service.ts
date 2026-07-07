import { adminGet } from '@/lib/api/admin-client'
import type { OrgsResponse } from '../types/orgs.types'

export async function fetchOrgs(): Promise<OrgsResponse> {
  return adminGet<OrgsResponse>('orgs')
}
