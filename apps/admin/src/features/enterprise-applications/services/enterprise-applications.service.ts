import { adminGet, adminPatch } from '@/lib/api/admin-client'
import type { EnterpriseApplicationsResponse } from '../types/enterprise-applications.types'

export async function fetchEnterpriseApplications(): Promise<EnterpriseApplicationsResponse> {
  return adminGet<EnterpriseApplicationsResponse>('enterprise-applications')
}

export async function updateEnterpriseApplication(
  id: string,
  updates: { status?: string; notes?: string },
): Promise<{ success: boolean }> {
  return adminPatch<{ success: boolean }>(`enterprise-applications/${id}`, updates)
}
