import { expect, test } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in with email' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Create account/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Forgot password/i })).toBeVisible()
  })

  test('email login form appears on click', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in with email' }).click()
    await expect(page.getByPlaceholder('you@domain.com')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    // Mock Supabase to return an error
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      })
    })

    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in with email' }).click()
    await page.getByPlaceholder('you@domain.com').fill('bad@example.com')
    await page.getByPlaceholder('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10_000 })
  })

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
    await expect(page.getByPlaceholder('you@domain.com')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Already have an account/i })).toBeVisible()
  })

  test('navigate from login to register', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /Create account/i }).click()
    await expect(page).toHaveURL('/register')
  })

  test('navigate from register to login', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('link', { name: /Already have an account/i }).click()
    await expect(page).toHaveURL('/login')
  })

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in with email' }).click()
    const passwordInput = page.getByPlaceholder('Password')
    await expect(passwordInput).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')

    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})
