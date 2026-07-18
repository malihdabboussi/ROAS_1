import { describe, expect, it } from 'vitest'
import {
  APP_HOME_PATH,
  buildAppRedirectUrl,
  buildAuthContinuationPath,
  NO_ORG_ACCESS_PATH,
  ONBOARDING_PATH,
  resolveAccessStatus,
  resolveAppRedirectPath,
  resolveAuthenticatedRedirect,
  type ResolveAuthenticatedRedirectInput,
} from './access-routing'

const baseInput: ResolveAuthenticatedRedirectInput = {
  isDashboard: false,
  isOnboardingPage: false,
  isSettingUpPage: false,
  isAuthPage: false,
  isInviteTokenPage: false,
  isNoOrgAccessPage: false,
  fullyOnboarded: true,
  isOrgOnly: false,
  accessStatus: 'granted',
}

function resolve(overrides: Partial<ResolveAuthenticatedRedirectInput>) {
  return resolveAuthenticatedRedirect({ ...baseInput, ...overrides })
}

describe('resolveAccessStatus', () => {
  it('grants access for an active subscription', () => {
    expect(
      resolveAccessStatus({
        hasActiveSubscription: true,
        hasActiveOrgMembership: false,
        accessCheckUnavailable: false,
      }),
    ).toBe('granted')
  })

  it('grants access for an active org membership', () => {
    expect(
      resolveAccessStatus({
        hasActiveSubscription: false,
        hasActiveOrgMembership: true,
        accessCheckUnavailable: false,
      }),
    ).toBe('granted')
  })

  it('denies access when all checks succeed without access', () => {
    expect(
      resolveAccessStatus({
        hasActiveSubscription: false,
        hasActiveOrgMembership: false,
        accessCheckUnavailable: false,
      }),
    ).toBe('denied')
  })

  it('returns unknown when an access check is unavailable', () => {
    expect(
      resolveAccessStatus({
        hasActiveSubscription: false,
        hasActiveOrgMembership: false,
        accessCheckUnavailable: true,
      }),
    ).toBe('unknown')
  })
})

describe('resolveAuthenticatedRedirect', () => {
  it('routes fully onboarded org-only dashboard users without access to no-org-access', () => {
    expect(resolve({ isDashboard: true, isOrgOnly: true, accessStatus: 'denied' })).toBe(
      NO_ORG_ACCESS_PATH,
    )
  })

  it('routes fully onboarded personal dashboard users without access to onboarding', () => {
    expect(resolve({ isDashboard: true, accessStatus: 'denied' })).toBe(ONBOARDING_PATH)
  })

  it('does not access-denial redirect dashboard users when access is unknown', () => {
    expect(resolve({ isDashboard: true, accessStatus: 'unknown' })).toBeNull()
  })

  it('routes incomplete dashboard users to onboarding', () => {
    expect(resolve({ isDashboard: true, fullyOnboarded: false, accessStatus: 'unknown' })).toBe(
      ONBOARDING_PATH,
    )
  })

  it('routes org-only onboarding users without access to no-org-access', () => {
    expect(resolve({ isOnboardingPage: true, isOrgOnly: true, accessStatus: 'denied' })).toBe(
      NO_ORG_ACCESS_PATH,
    )
  })

  it('routes fully onboarded onboarding users with access home', () => {
    expect(resolve({ isOnboardingPage: true, accessStatus: 'granted' })).toBe(APP_HOME_PATH)
  })

  it('keeps personal onboarding users without access on onboarding', () => {
    expect(resolve({ isOnboardingPage: true, accessStatus: 'denied' })).toBeNull()
  })

  it('routes no-org-access away when access is granted, unknown, or non-org-only', () => {
    expect(resolve({ isNoOrgAccessPage: true, isOrgOnly: true, accessStatus: 'granted' })).toBe(
      APP_HOME_PATH,
    )
    expect(resolve({ isNoOrgAccessPage: true, isOrgOnly: true, accessStatus: 'unknown' })).toBe(
      APP_HOME_PATH,
    )
    expect(resolve({ isNoOrgAccessPage: true, isOrgOnly: false, accessStatus: 'denied' })).toBe(
      APP_HOME_PATH,
    )
  })

  it('leaves denied org-only users on no-org-access', () => {
    expect(resolve({ isNoOrgAccessPage: true, isOrgOnly: true, accessStatus: 'denied' })).toBeNull()
  })

  it('preserves invite token and setting-up routes', () => {
    expect(resolve({ isAuthPage: true, isInviteTokenPage: true })).toBeNull()
    expect(resolve({ isSettingUpPage: true, fullyOnboarded: false })).toBeNull()
  })
})

describe('resolveAppRedirectPath', () => {
  it('preserves internal paths with query parameters and fragments', () => {
    expect(resolveAppRedirectPath('/home?tab=manage#integrations')).toBe(
      '/home?tab=manage#integrations',
    )
  })

  it('falls back for absolute and protocol-relative destinations', () => {
    expect(resolveAppRedirectPath('https://example.com/account')).toBe(APP_HOME_PATH)
    expect(resolveAppRedirectPath('//example.com/account')).toBe(APP_HOME_PATH)
    expect(resolveAppRedirectPath('/\\example.com/account')).toBe(APP_HOME_PATH)
  })

  it('falls back for empty and non-path destinations', () => {
    expect(resolveAppRedirectPath(null)).toBe(APP_HOME_PATH)
    expect(resolveAppRedirectPath('home')).toBe(APP_HOME_PATH)
  })
})

describe('buildAppRedirectUrl', () => {
  it('merges callback state into an existing redirect query', () => {
    const redirect = buildAppRedirectUrl('https://app.roas.io', '/home?tab=manage', {
      promo: 'LAUNCH',
      message: 'Welcome back',
    })

    expect(redirect.toString()).toBe(
      'https://app.roas.io/home?tab=manage&promo=LAUNCH&message=Welcome+back',
    )
  })

  it('keeps the destination on the supplied app origin', () => {
    const redirect = buildAppRedirectUrl('https://app.roas.io', 'https://example.com/account')

    expect(redirect.toString()).toBe('https://app.roas.io/home')
  })
})

describe('buildAuthContinuationPath', () => {
  it('carries a safe destination and normalized promo to the next auth page', () => {
    expect(buildAuthContinuationPath('/forgot-password', '/home?tab=manage', ' launch ')).toBe(
      '/forgot-password?redirect=%2Fhome%3Ftab%3Dmanage&promo=LAUNCH',
    )
  })

  it('omits default and unsafe destinations', () => {
    expect(buildAuthContinuationPath('/login', '/home', null)).toBe('/login')
    expect(buildAuthContinuationPath('/login', 'https://example.com', 'launch')).toBe(
      '/login?promo=LAUNCH',
    )
  })
})
