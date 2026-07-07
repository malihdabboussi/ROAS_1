import { adminGet } from '@/lib/api/admin-client'
import type { AdminBillingScope, DashboardStats, MachineStats } from '../types/dashboard.types'

export async function getDashboardStats(scope: AdminBillingScope = 'all'): Promise<DashboardStats> {
  const qs = new URLSearchParams({ scope })
  return adminGet<DashboardStats>(`dashboard?${qs.toString()}`)
}

export async function getMachineStats(): Promise<MachineStats> {
  return adminGet<MachineStats>('machines')
}
