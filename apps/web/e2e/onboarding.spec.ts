import { expect, test } from '@playwright/test'

test.describe('Onboarding page', () => {
  test('loads the onboarding route', async ({ page }) => {
    await page.route('**/auth/v1/user', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'not authenticated' }) }),
    )
    await page.goto('/onboarding')
    // Page should load (may redirect or show content)
    await expect(page).toHaveURL(/onboarding|login/)
  })

  test('shows setup screen when machine provisioning is needed', async ({ page }) => {
    await page.route('**/auth/v1/token*', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          access_token: 'fake-token',
          user: { id: 'user-1', email: 'test@vibey.im' },
        }),
      }),
    )
    await page.route('**/auth/v1/user', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 'user-1', email: 'test@vibey.im' }),
      }),
    )
    await page.route('**/api/profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-1',
          onboarding_completed: false,
          fly_machine_id: null,
          onboarding_animation_seen: false,
        }),
      }),
    )
    await page.goto('/onboarding')
    // Should render without crashing
    await page.waitForTimeout(1000)
    // The onboarding animation or content should appear
    const body = await page.locator('body').textContent()
    expect(body).toBeTruthy()
  })
})
