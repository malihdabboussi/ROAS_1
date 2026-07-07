import { expect, test } from '@playwright/test'

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase auth so the dashboard layout doesn't redirect to /login
    // The server-side check uses getUser(), so we mock that endpoint
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

    // Mock the session/token refresh
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
  })

  test('login page has links to register and forgot password', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: /Create account/i })).toHaveAttribute(
      'href',
      '/register',
    )
    await expect(page.getByRole('link', { name: /Forgot password/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  test('register page links back to login', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('link', { name: /Already have an account/i })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  test('unauthenticated user is redirected to login from dashboard', async ({ page }) => {
    // Override the auth mock to return 401 (no user)
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'not authenticated' }),
      })
    })

    await page.goto('/')
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })

  test('forgot password page is accessible', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page).toHaveURL('/forgot-password')
  })
})
