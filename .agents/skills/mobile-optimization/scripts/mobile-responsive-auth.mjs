import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const YC_DEMO_EMAIL = 'yc-demo@vibey.im'

export async function prepareAuthState(browser, options) {
  if (options.authState) {
    return path.resolve(options.repoRoot, options.authState)
  }

  const credentials = resolveLoginCredentials(options)
  if (!credentials) {
    return null
  }

  const authStatePath = resolveAuthStatePath(options)
  fs.mkdirSync(path.dirname(authStatePath), { recursive: true })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  try {
    await page.goto(options.routeUrl(options.baseUrl, '/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    const emailButton = page.getByRole('button', { name: /sign in with email/i })
    if ((await emailButton.count()) > 0) {
      await emailButton.click({ timeout: 5_000 }).catch(() => undefined)
    }

    await page.getByPlaceholder('you@domain.com').fill(credentials.email)
    await page.getByPlaceholder('Password').fill(credentials.password)
    await page.getByRole('button', { name: /^sign in$/i }).click()

    await page
      .waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
      .catch(() => undefined)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)

    const finalPath = new URL(page.url()).pathname
    if (finalPath.includes('/login')) {
      throw new Error('Login did not leave /login. Check the audit login credentials.')
    }

    await context.storageState({ path: authStatePath })
    return authStatePath
  } finally {
    await context.close()
  }
}

function resolveLoginCredentials(options) {
  const hasLoginRequest =
    options.login || options.loginPreset || options.loginEmail || options.loginPasswordEnv
  if (!hasLoginRequest) {
    return null
  }

  if (options.loginPreset && options.loginPreset !== 'yc-demo') {
    throw new Error(`Unsupported login preset: ${options.loginPreset}`)
  }

  const email =
    options.loginEmail ||
    process.env.VIBEY_MOBILE_AUDIT_EMAIL ||
    (options.loginPreset === 'yc-demo' ? YC_DEMO_EMAIL : null)
  if (!email) {
    throw new Error('Missing login email. Pass --login-email or set VIBEY_MOBILE_AUDIT_EMAIL.')
  }

  const password = resolveLoginPassword(options)
  if (!password) {
    throw new Error(
      'Missing login password. Set VIBEY_MOBILE_AUDIT_PASSWORD, pass --login-password-env, or provide the local YC demo credentials file.',
    )
  }

  return { email, password }
}

function resolveLoginPassword(options) {
  if (options.loginPasswordEnv) {
    return process.env[options.loginPasswordEnv] || null
  }

  return (
    process.env.VIBEY_MOBILE_AUDIT_PASSWORD ||
    (options.loginPreset === 'yc-demo' ? process.env.YC_DEMO_PASSWORD : null) ||
    (options.loginPreset === 'yc-demo' ? readYcDemoPassword(options.repoRoot) : null)
  )
}

function readYcDemoPassword(repoRoot) {
  const credentialsPath = path.join(repoRoot, 'apps/api/.docs/yc-demo-credentials.md')
  if (!fs.existsSync(credentialsPath)) {
    return null
  }

  const content = fs.readFileSync(credentialsPath, 'utf8')
  const match = content.match(/^Password:\s*(.+)$/m)
  return match ? match[1].trim() : null
}

function resolveAuthStatePath(options) {
  if (options.saveAuthState) {
    return path.resolve(options.repoRoot, options.saveAuthState)
  }

  return path.join(path.dirname(options.outputPath), 'mobile-responsive-auth-state.json')
}
