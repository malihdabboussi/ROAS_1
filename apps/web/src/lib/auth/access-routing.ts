export const APP_HOME_PATH = '/home' as const
export const ONBOARDING_PATH = '/onboarding' as const
export const NO_ORG_ACCESS_PATH = '/no-org-access' as const

export type AccessStatus = 'granted' | 'denied' | 'unknown'

type ResolveAccessStatusInput = {
  hasActiveSubscription: boolean
  hasActiveOrgMembership: boolean
  accessCheckUnavailable: boolean
}

export type ResolveAuthenticatedRedirectInput = {
  isDashboard: boolean
  isOnboardingPage: boolean
  isSettingUpPage: boolean
  isAuthPage: boolean
  isInviteTokenPage: boolean
  isNoOrgAccessPage: boolean
  fullyOnboarded: boolean
  isOrgOnly: boolean
  accessStatus: AccessStatus
}

export function resolveAccessStatus({
  hasActiveSubscription,
  hasActiveOrgMembership,
  accessCheckUnavailable,
}: ResolveAccessStatusInput): AccessStatus {
  if (accessCheckUnavailable) return 'unknown'
  return hasActiveSubscription || hasActiveOrgMembership ? 'granted' : 'denied'
}

export function resolveAuthenticatedRedirect({
  isDashboard,
  isOnboardingPage,
  isSettingUpPage,
  isAuthPage,
  isInviteTokenPage,
  isNoOrgAccessPage,
  fullyOnboarded,
  isOrgOnly,
  accessStatus,
}: ResolveAuthenticatedRedirectInput): string | null {
  if (isInviteTokenPage || isSettingUpPage) return null

  if (isNoOrgAccessPage) {
    return isOrgOnly && accessStatus === 'denied' ? null : APP_HOME_PATH
  }

  if (isOnboardingPage) {
    if (isOrgOnly && accessStatus === 'denied') return NO_ORG_ACCESS_PATH
    if (fullyOnboarded && accessStatus === 'granted') return APP_HOME_PATH
    return null
  }

  if (isDashboard) {
    if (!fullyOnboarded) return ONBOARDING_PATH
    if (accessStatus !== 'denied') return null
    return isOrgOnly ? NO_ORG_ACCESS_PATH : ONBOARDING_PATH
  }

  if (isAuthPage) {
    if (!fullyOnboarded) return ONBOARDING_PATH
    if (accessStatus === 'denied') return isOrgOnly ? NO_ORG_ACCESS_PATH : ONBOARDING_PATH
    return APP_HOME_PATH
  }

  return null
}
