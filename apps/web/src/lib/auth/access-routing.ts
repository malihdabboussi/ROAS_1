export const APP_HOME_PATH = '/home' as const
export const ONBOARDING_PATH = '/onboarding' as const
export const NO_ORG_ACCESS_PATH = '/no-org-access' as const

const REDIRECT_VALIDATION_ORIGIN = 'https://app.roas.invalid'

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

export function resolveAppRedirectPath(requestedRedirect: string | null | undefined): string {
  if (!requestedRedirect?.startsWith('/')) return APP_HOME_PATH

  try {
    const target = new URL(requestedRedirect, REDIRECT_VALIDATION_ORIGIN)
    if (target.origin !== REDIRECT_VALIDATION_ORIGIN) return APP_HOME_PATH
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return APP_HOME_PATH
  }
}

export function buildAppRedirectUrl(
  appOrigin: string,
  requestedRedirect: string | null | undefined,
  searchParams: Record<string, string | null | undefined> = {},
): URL {
  const target = new URL(resolveAppRedirectPath(requestedRedirect), appOrigin)
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) target.searchParams.set(key, value)
  }
  return target
}

export function buildAuthContinuationPath(
  authPath: '/login' | '/forgot-password' | '/reset-password',
  requestedRedirect: string | null | undefined,
  promoCode: string | null | undefined,
): string {
  const params = new URLSearchParams()
  const redirectPath = resolveAppRedirectPath(requestedRedirect)
  if (redirectPath !== APP_HOME_PATH) params.set('redirect', redirectPath)
  const normalizedPromo = promoCode?.trim().toUpperCase()
  if (normalizedPromo) params.set('promo', normalizedPromo)
  const query = params.toString()
  return `${authPath}${query ? `?${query}` : ''}`
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
