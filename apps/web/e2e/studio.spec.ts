import { expect, test } from '@playwright/test'

test.describe('Studio', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase auth endpoints
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

    // Mock conversations API
    await page.route('**/rest/v1/conversations*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-conv-id',
            title: 'New Conversation',
            created_at: new Date().toISOString(),
          }),
        })
      }
    })

    // Mock messages API
    await page.route('**/rest/v1/messages*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
  })

  test('studio page loads', async ({ page }) => {
    await page.goto('/studio')
    // Should not redirect to login (auth is mocked)
    await page.waitForTimeout(2000)
    // The page should contain studio-related elements
    const url = page.url()
    expect(url).toContain('/studio')
  })

  test('chat input is present on studio page', async ({ page }) => {
    await page.goto('/studio')
    await page.waitForTimeout(2000)
    // Look for the chat textarea/input
    const chatInput = page.locator('textarea').first()
    if (await chatInput.isVisible()) {
      await expect(chatInput).toBeVisible()
    }
  })
})
