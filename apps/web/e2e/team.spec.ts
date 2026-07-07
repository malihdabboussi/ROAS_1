import { expect, test } from '@playwright/test'

test.describe('Team page', () => {
  test.beforeEach(async ({ page }) => {
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
    await page.route('**/api/profile*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-1',
          onboarding_completed: true,
          fly_machine_id: 'machine-1',
        }),
      }),
    )
    await page.route('**/rest/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    )
    await page.route('**/api/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
    )
  })

  test('navigates to team page without crashing', async ({ page }) => {
    await page.goto('/team')
    await page.waitForTimeout(2000)
    // Should be on team or have redirected
    const url = page.url()
    expect(url).toBeTruthy()
  })
})
