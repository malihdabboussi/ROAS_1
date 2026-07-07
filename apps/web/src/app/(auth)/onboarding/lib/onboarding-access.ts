import { backendGet } from '@/lib/api/backend-client'

/** Set on `/join?code=…` when the direct invite code validates; read during onboarding. */
export const VIBEY_DIRECT_INVITE_STORAGE_KEY = 'vibey-direct-invite' as const

/** Stores the actual validated invite code so provision can forward it to the backend. */
export const VIBEY_DIRECT_INVITE_CODE_KEY = 'vibey-direct-invite-code' as const

type OrgMembershipForOnboarding = {
  status?: string | null
  role?: string | null
}

type OrgMembershipsResponse = {
  success?: boolean
  memberships?: OrgMembershipForOnboarding[]
}

type BillingStatusResponse = {
  subscription?: { status?: string | null } | null
}

type SubscribeGateInput = {
  hasRuntimeEligibleOrgMembership: boolean
  hasDirectInviteCode: boolean
  subscriptionStatus?: string | null
}

export type OnboardedHomeAccessStatus = 'granted' | 'denied' | 'unknown'

const RUNTIME_ELIGIBLE_ORG_ROLES = new Set(['owner', 'admin', 'creator', 'editor'])

export function hasAnyActiveOrgMembershipFromResponse(response: OrgMembershipsResponse | null) {
  return (
    response?.success === true &&
    Array.isArray(response.memberships) &&
    response.memberships.some((membership) => membership.status === 'active')
  )
}

export function hasActiveSubscriptionStatus(status?: string | null) {
  return status === 'active' || status === 'trialing'
}

export function hasRuntimeEligibleOrgMembershipFromResponse(
  response: OrgMembershipsResponse | null,
) {
  return (
    response?.success === true &&
    Array.isArray(response.memberships) &&
    response.memberships.some(
      (membership) =>
        membership.status === 'active' && RUNTIME_ELIGIBLE_ORG_ROLES.has(membership.role ?? ''),
    )
  )
}

export function shouldSkipSubscribeStep({
  hasRuntimeEligibleOrgMembership,
  hasDirectInviteCode,
  subscriptionStatus,
}: SubscribeGateInput) {
  return (
    hasRuntimeEligibleOrgMembership ||
    hasDirectInviteCode ||
    subscriptionStatus === 'active' ||
    subscriptionStatus === 'trialing'
  )
}

export function getStoredDirectInviteCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const code = window.localStorage.getItem(VIBEY_DIRECT_INVITE_CODE_KEY)?.trim() ?? ''
    return code.length > 0 ? code : null
  } catch {
    return null
  }
}

export function clearStoredDirectInviteCode(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(VIBEY_DIRECT_INVITE_STORAGE_KEY)
    window.localStorage.removeItem(VIBEY_DIRECT_INVITE_CODE_KEY)
  } catch {}
}

export async function hasRuntimeEligibleOrgMembership() {
  const response = await backendGet<OrgMembershipsResponse>('/api/org/my')
  return hasRuntimeEligibleOrgMembershipFromResponse(response)
}

export async function resolveOnboardedHomeAccess(): Promise<OnboardedHomeAccessStatus> {
  const [orgResult, billingResult] = await Promise.allSettled([
    backendGet<OrgMembershipsResponse>('/api/org/my'),
    backendGet<BillingStatusResponse>('/api/billing/status'),
  ])

  if (orgResult.status === 'rejected' || billingResult.status === 'rejected') {
    return 'unknown'
  }

  return hasAnyActiveOrgMembershipFromResponse(orgResult.value) ||
    hasActiveSubscriptionStatus(billingResult.value?.subscription?.status)
    ? 'granted'
    : 'denied'
}
