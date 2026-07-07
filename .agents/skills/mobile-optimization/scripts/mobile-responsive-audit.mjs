#!/usr/bin/env node
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { prepareAuthState } from './mobile-responsive-auth.mjs'
import {
  collectRoutes,
  getScreenshotPath,
  resolveOutputPath,
  routeUrl,
} from './mobile-responsive-routes.mjs'

const require = createRequire(import.meta.url)
const repoRoot = process.cwd()

function parseArgs(argv) {
  const options = {
    baseUrl: 'http://localhost:3000',
    browserChannel: null,
    browserExecutable: null,
    paths: [],
    pathsFile: null,
    authState: null,
    login: false,
    loginEmail: null,
    loginPasswordEnv: null,
    loginPreset: null,
    out: null,
    quiet: false,
    routeTimeout: 15_000,
    screenshots: false,
    saveAuthState: null,
    settleMs: 700,
    failOnFindings: false,
    listRoutes: false,
    maxPages: 80,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--base-url' && next) {
      options.baseUrl = next
      index += 1
    } else if (arg === '--browser-channel' && next) {
      options.browserChannel = next
      index += 1
    } else if (arg === '--browser-executable' && next) {
      options.browserExecutable = next
      index += 1
    } else if (arg === '--paths' && next) {
      options.paths.push(
        ...next
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      )
      index += 1
    } else if (arg === '--paths-file' && next) {
      options.pathsFile = next
      index += 1
    } else if (arg === '--auth-state' && next) {
      options.authState = next
      index += 1
    } else if (arg === '--login') {
      options.login = true
    } else if (arg === '--login-email' && next) {
      options.loginEmail = next
      index += 1
    } else if (arg === '--login-password-env' && next) {
      options.loginPasswordEnv = next
      index += 1
    } else if (arg === '--login-preset' && next) {
      options.loginPreset = next
      index += 1
    } else if (arg === '--save-auth-state' && next) {
      options.saveAuthState = next
      index += 1
    } else if (arg === '--out' && next) {
      options.out = next
      index += 1
    } else if (arg === '--quiet') {
      options.quiet = true
    } else if (arg === '--route-timeout' && next) {
      options.routeTimeout = Number(next)
      index += 1
    } else if (arg === '--screenshots') {
      options.screenshots = true
    } else if (arg === '--settle-ms' && next) {
      options.settleMs = Number(next)
      index += 1
    } else if (arg === '--fail-on-findings') {
      options.failOnFindings = true
    } else if (arg === '--list-routes') {
      options.listRoutes = true
    } else if (arg === '--max-pages' && next) {
      options.maxPages = Number(next)
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`)
    }
  }

  return options
}

function printHelp() {
  console.log(`Mobile responsive audit

Usage:
  node .agents/skills/mobile-optimization/scripts/mobile-responsive-audit.mjs [options]

Options:
  --base-url <url>       App URL. Default: http://localhost:3000
  --browser-channel <name>  Playwright browser channel, e.g. chrome
  --browser-executable <path>  Browser executable path
  --paths <routes>       Comma-separated routes, e.g. /,/team,/studio
  --paths-file <file>    Newline-delimited route list
  --auth-state <file>    Playwright storageState JSON for authenticated pages
  --login                Create a storageState through the login UI
  --login-email <email>  Email for --login. Defaults to VIBEY_MOBILE_AUDIT_EMAIL
  --login-password-env <name>  Env var containing the login password
  --login-preset <name>  Built-in login preset. Supported: yc-demo
  --save-auth-state <file>  Path for generated storageState
  --quiet               Suppress per-route progress output
  --route-timeout <ms>  Page navigation timeout. Default: 15000
  --screenshots          Save screenshots for route/viewport pairs with findings
  --settle-ms <ms>      Wait after DOMContentLoaded. Default: 700
  --out <file>           Write JSON report
  --fail-on-findings     Exit 1 when findings are present
  --list-routes          Print routes without launching a browser
  --max-pages <n>        Cap inferred static routes. Default: 80
`)
}

function loadPlaywright() {
  const resolved = require.resolve('@playwright/test', {
    paths: [path.join(repoRoot, 'apps/web'), repoRoot],
  })

  return require(resolved)
}

async function auditRoute(browser, options, outputPath, route, viewport) {
  const contextOptions = {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: true,
  }

  if (options.authState) {
    contextOptions.storageState = path.resolve(repoRoot, options.authState)
  }

  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  const findings = []
  let status = null
  let finalUrl = null
  let title = null

  try {
    const response = await page.goto(routeUrl(options.baseUrl, route), {
      waitUntil: 'domcontentloaded',
      timeout: options.routeTimeout,
    })
    await page.waitForTimeout(options.settleMs)
    status = response ? response.status() : null
    finalUrl = page.url()
    title = await page.title()

    let runtimeFindings = []
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        runtimeFindings = await page.evaluate((viewportName) => {
          const viewportWidth = document.documentElement.clientWidth
          const viewportHeight = window.innerHeight
          const issues = []
          const viewportMeta = document.querySelector('meta[name="viewport"]')

          if (!viewportMeta) {
            issues.push({
              type: 'missing-viewport-meta',
              severity: 'high',
              message: 'Missing viewport meta tag.',
            })
          }

          const overflow = document.documentElement.scrollWidth - viewportWidth
          if (overflow > 2) {
            issues.push({
              type: 'document-horizontal-overflow',
              severity: 'high',
              message: `Document overflows ${overflow}px beyond ${viewportWidth}px viewport.`,
              viewport: viewportName,
              overflow,
            })
          }

          const visibleElements = Array.from(document.body.querySelectorAll('*')).filter(
            (element) => {
              const rect = element.getBoundingClientRect()
              const style = window.getComputedStyle(element)
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom >= 0 &&
                rect.right >= 0 &&
                rect.top <= viewportHeight &&
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                Number(style.opacity) !== 0
              )
            },
          )

          const describe = (element) => {
            const id = element.id ? `#${element.id}` : ''
            const classes =
              typeof element.className === 'string'
                ? element.className
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((value) => `.${value}`)
                    .join('')
                : ''
            const testId = element.getAttribute('data-testid')
            const label = element.getAttribute('aria-label') || element.getAttribute('title') || ''
            const text = (element.innerText || element.textContent || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 80)
            return {
              selector: `${element.tagName.toLowerCase()}${id}${classes}${testId ? `[data-testid="${testId}"]` : ''}`,
              label,
              text,
            }
          }

          for (const element of visibleElements) {
            const rect = element.getBoundingClientRect()
            const style = window.getComputedStyle(element)
            const isRoot = element === document.body || element === document.documentElement
            const hasViewportOverflow =
              !isRoot &&
              (rect.left < -2 || rect.right > viewportWidth + 2 || rect.width > viewportWidth + 2)

            if (hasViewportOverflow) {
              issues.push({
                type: 'element-overflows-viewport',
                severity: 'high',
                message: `Visible element extends beyond the ${viewportWidth}px viewport.`,
                ...describe(element),
                rect: {
                  left: Math.round(rect.left),
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                },
              })
            }

            const minWidth = Number.parseFloat(style.minWidth)
            const width = Number.parseFloat(style.width)
            if (
              (Number.isFinite(minWidth) && minWidth > viewportWidth + 2) ||
              (Number.isFinite(width) && width > viewportWidth + 2 && style.position === 'fixed')
            ) {
              issues.push({
                type: 'fixed-width-exceeds-viewport',
                severity: 'medium',
                message: `Computed width/min-width exceeds ${viewportWidth}px viewport.`,
                ...describe(element),
                computed: {
                  width: style.width,
                  minWidth: style.minWidth,
                  position: style.position,
                },
              })
            }

            const hasClippedContent =
              element.scrollWidth > element.clientWidth + 2 && element.clientWidth > 0
            const mayContainText = (element.innerText || '').trim().length > 0
            const clipsWithoutIntentionalScroll =
              hasClippedContent && mayContainText && !['auto', 'scroll'].includes(style.overflowX)

            if (clipsWithoutIntentionalScroll) {
              issues.push({
                type: 'clipped-content',
                severity: 'medium',
                message:
                  'Element has clipped horizontal content without intentional horizontal scrolling.',
                ...describe(element),
                overflow: {
                  scrollWidth: element.scrollWidth,
                  clientWidth: element.clientWidth,
                  overflowX: style.overflowX,
                },
              })
            }
          }

          const targetSelector =
            'a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
          const tapTargets = Array.from(document.querySelectorAll(targetSelector)).filter(
            (element) => {
              const rect = element.getBoundingClientRect()
              const style = window.getComputedStyle(element)
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom >= 0 &&
                rect.right >= 0 &&
                rect.top <= viewportHeight &&
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                !element.hasAttribute('disabled')
              )
            },
          )

          for (const element of tapTargets) {
            const rect = element.getBoundingClientRect()
            if (rect.width < 32 || rect.height < 32) {
              issues.push({
                type: 'small-tap-target',
                severity: 'low',
                message: 'Interactive target is smaller than 32px in one dimension.',
                ...describe(element),
                rect: {
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                },
              })
            }
          }

          return issues.slice(0, 80)
        }, viewport.name)
        break
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (attempt < 2 && message.includes('Execution context was destroyed')) {
          await page.waitForTimeout(options.settleMs)
          finalUrl = page.url()
          title = await page.title().catch(() => title)
          continue
        }
        throw error
      }
    }

    findings.push(...runtimeFindings)

    if (status && status >= 400) {
      findings.push({
        type: 'route-load-error',
        severity: 'high',
        message: `Route returned HTTP ${status}.`,
      })
    }
  } catch (error) {
    findings.push({
      type: 'route-audit-error',
      severity: 'high',
      message: error instanceof Error ? error.message : String(error),
    })
  }

  let screenshot = null
  if (options.screenshots && findings.length > 0) {
    screenshot = getScreenshotPath(outputPath, route, viewport.name)
    await page.screenshot({ path: screenshot, fullPage: true }).catch((error) => {
      findings.push({
        type: 'screenshot-error',
        severity: 'low',
        message: error instanceof Error ? error.message : String(error),
      })
      screenshot = null
    })
  }

  await context.close()

  return {
    route,
    viewport: viewport.name,
    dimensions: { width: viewport.width, height: viewport.height },
    status,
    finalUrl,
    title,
    screenshot,
    consoleErrors: consoleErrors.slice(0, 10),
    findings,
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { routes, skippedDynamicRoutes, routeSource } = collectRoutes(repoRoot, options)

  if (routes.length === 0) {
    throw new Error('No routes found. Pass --paths or --paths-file.')
  }

  if (options.listRoutes) {
    console.log(`Route source: ${routeSource}`)
    console.log(`Routes (${routes.length}):`)
    for (const route of routes) {
      console.log(route)
    }
    if (skippedDynamicRoutes.length > 0) {
      console.log(`Skipped dynamic routes (${skippedDynamicRoutes.length}):`)
      for (const route of skippedDynamicRoutes) {
        console.log(route)
      }
    }
    return
  }

  const outputPath = resolveOutputPath(repoRoot, options.out)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })

  const { chromium } = loadPlaywright()
  const viewports = [
    { name: 'iphone-se', width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
    { name: 'iphone-modern', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
    { name: 'android-compact', width: 360, height: 800, deviceScaleFactor: 3, isMobile: true },
    { name: 'tablet-portrait', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
  ]

  const browser = await launchBrowser(chromium, options)
  const results = []
  const authState = await prepareAuthState(browser, {
    ...options,
    outputPath,
    repoRoot,
    routeUrl,
  })
  const auditOptions = { ...options, authState }

  const totalChecks = routes.length * viewports.length
  let completedChecks = 0
  for (const route of routes) {
    for (const viewport of viewports) {
      completedChecks += 1
      if (!options.quiet) {
        console.log(`[${completedChecks}/${totalChecks}] ${route} ${viewport.name}`)
      }
      results.push(await auditRoute(browser, auditOptions, outputPath, route, viewport))
    }
  }

  await browser.close()

  const totalFindings = results.reduce((sum, result) => sum + result.findings.length, 0)
  const highFindings = results.reduce(
    (sum, result) => sum + result.findings.filter((finding) => finding.severity === 'high').length,
    0,
  )
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    routeSource,
    routeCount: routes.length,
    viewportCount: viewports.length,
    totalFindings,
    highFindings,
    skippedDynamicRoutes,
    results,
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)

  console.log(
    `Mobile responsive audit complete: ${totalFindings} findings across ${routes.length} routes.`,
  )
  console.log(`Report: ${outputPath}`)
  if (skippedDynamicRoutes.length > 0) {
    console.log(
      `Skipped dynamic routes: ${skippedDynamicRoutes.length}. Pass representative URLs with --paths.`,
    )
  }

  if (options.failOnFindings && totalFindings > 0) {
    process.exitCode = 1
  }
}

async function launchBrowser(chromium, options) {
  const launchOptions = {}
  if (options.browserExecutable) {
    launchOptions.executablePath = path.resolve(repoRoot, options.browserExecutable)
  } else if (options.browserChannel) {
    launchOptions.channel = options.browserChannel
  }

  try {
    return await chromium.launch(launchOptions)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      !options.browserExecutable &&
      !options.browserChannel &&
      (message.includes("Executable doesn't exist") || message.includes('playwright install'))
    ) {
      return await chromium.launch({ channel: 'chrome' })
    }
    if (message.includes("Executable doesn't exist") || message.includes('playwright install')) {
      throw new Error(
        'No usable Playwright Chromium browser was found. Install Playwright browsers or pass --browser-channel chrome / --browser-executable.',
      )
    }
    throw error
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
