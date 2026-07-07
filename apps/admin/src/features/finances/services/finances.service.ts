import { adminGet } from '@/lib/api/admin-client'
import type { AdminBillingScope, FinancesData } from '../types/finances.types'

export async function fetchFinances(params?: {
  days?: string
  from?: string
  to?: string
  scope?: AdminBillingScope
}): Promise<FinancesData> {
  const qs = new URLSearchParams()
  if (params?.days) qs.set('days', params.days)
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  if (params?.scope) qs.set('scope', params.scope)
  const query = qs.toString()
  return adminGet<FinancesData>(`finances${query ? `?${query}` : ''}`)
}
