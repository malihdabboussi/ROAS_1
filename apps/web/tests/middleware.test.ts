import { describe, expect, it } from 'vitest'
import {
  APP_HOME_PATH,
  NO_ORG_ACCESS_PATH,
  ONBOARDING_PATH,
  type ResolveAuthenticatedRedirectInput,
  resolveAuthenticatedRedirect,
} from '../src/lib/auth/access-routing'

const baseRedirectInput: ResolveAuthenticatedRedirectInput = {
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

function resolveRedirect(overrides: Partial<ResolveAuthenticatedRedirectInput>) {
  return resolveAuthenticatedRedirect({ ...baseRedirectInput, ...overrides })
}

// We test the middleware logic by examining the config and testing route matching
describe('Auth Middleware', () => {
  it('exports a config with correct matcher', async () => {
    const { config } = await import('../src/middleware')
    expect(config).toBeDefined()
    expect(config.matcher).toBeDefined()
    expect(config.matcher).toHaveLength(1)
  })

  it('matcher excludes static assets and callbacks', async () => {
    const { config } = await import('../src/middleware')
    const pattern = config.matcher[0] as string

    // Verify the pattern contains expected exclusion strings
    expect(pattern).toContain('_next/static')
    expect(pattern).toContain('favicon')
    expect(pattern).toContain('callback')
  })

  it('middleware function is exported', async () => {
    const mod = await import('../src/middleware')
    expect(typeof mod.middleware).toBe('function')
  })
})

describe('Access redirect decisions', () => {
  it('routes org-only dashboard users without access away from onboarding', () => {
    expect(
      resolveRedirect({
        isDashboard: true,
        isOrgOnly: true,
        accessStatus: 'denied',
      }),
    ).toBe(NO_ORG_ACCESS_PATH)
  })

  it('keeps personal dashboard users without access in the onboarding subscription flow', () => {
    expect(
      resolveRedirect({
        isDashboard: true,
        accessStatus: 'denied',
      }),
    ).toBe(ONBOARDING_PATH)
  })

  it('does not redirect dashboard users to onboarding when access is unknown', () => {
    expect(
      resolveRedirect({
        isDashboard: true,
        accessStatus: 'unknown',
      }),
    ).toBeNull()
  })

  it('does not bounce denied org-only users from no-org-access', () => {
    expect(
      resolveRedirect({
        isNoOrgAccessPage: true,
        isOrgOnly: true,
        accessStatus: 'denied',
      }),
    ).toBeNull()
  })

  it('sends recovered or unrelated no-org-access visits home for a fresh middleware check', () => {
    expect(
      resolveRedirect({
        isNoOrgAccessPage: true,
        isOrgOnly: true,
        accessStatus: 'granted',
      }),
    ).toBe(APP_HOME_PATH)
    expect(
      resolveRedirect({
        isNoOrgAccessPage: true,
        isOrgOnly: true,
        accessStatus: 'unknown',
      }),
    ).toBe(APP_HOME_PATH)
    expect(
      resolveRedirect({
        isNoOrgAccessPage: true,
        isOrgOnly: false,
        accessStatus: 'denied',
      }),
    ).toBe(APP_HOME_PATH)
  })
})
