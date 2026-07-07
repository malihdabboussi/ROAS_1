import type { BillingStatusResponse } from '@/lib/billing/billing.types'
import type { UserRole } from '@/hooks/use-user-role'

export function isMetaIntegrationsLibraryEligible(
  platformRole: UserRole,
  billing: BillingStatusResponse | null,
): boolean {
  if (platformRole === 'admin' || platformRole === 'enterprise') return true
  if (!billing) return false
  const r = String(billing.role ?? '').trim()
  if (r === 'admin' || r === 'enterprise') return true
  const slug = String(billing.plan?.slug ?? '')
  if (slug.startsWith('enterprise')) return true
  return false
}
