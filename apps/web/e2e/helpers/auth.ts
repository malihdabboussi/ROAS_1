import { type Page } from '@playwright/test'

export const TEST_USER = {
  email: `e2e-test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
}

/**
 * Login via the UI (email/password flow).
 * Assumes user already exists in Supabase.
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login')
  // Click "Sign in with email" to reveal the form
  await page.getByRole('button', { name: 'Sign in with email' }).click()
  await page.getByPlaceholder('you@domain.com').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 15_000 })
}

/**
 * Register a new user via the UI.
 * Public /register is closed; prefer invite flows for new accounts.
 */
export async function registerViaUI(_page: Page, _email: string, _password: string) {
  throw new Error('Public sign-up is closed. Use an invite link or admin-created account.')
}

/**
 * Mock Supabase auth by setting a fake session cookie/localStorage.
 * This is faster than going through the UI for beforeEach hooks.
 */
export async function mockSupabaseAuth(page: Page) {
  // Route Supabase auth API calls to return a mock session
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'fake-refresh-token',
        user: {
          id: 'e2e-test-user-id',
          email: 'e2e@test.com',
          user_metadata: { full_name: 'E2E Test User' },
          email_confirmed_at: new Date().toISOString(),
        },
      }),
    })
  })

  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'e2e-test-user-id',
        email: 'e2e@test.com',
        user_metadata: { full_name: 'E2E Test User' },
        email_confirmed_at: new Date().toISOString(),
      }),
    })
  })
}
