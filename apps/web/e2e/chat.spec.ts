import { expect, test } from '@playwright/test'

test.describe('Chat functionality', () => {
  test('chat page loads without errors', async ({ page }) => {
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
    await page.route('**/rest/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    )
    await page.route('**/api/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
    )
    await page.goto('/team')
    await page.waitForTimeout(2000)
    // No unhandled JS errors
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    expect(errors.filter((e) => !e.includes('aborted'))).toHaveLength(0)
  })
})
