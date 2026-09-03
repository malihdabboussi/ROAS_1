#!/usr/bin/env node

import { isIP } from 'node:net'
import { mkdir } from 'node:fs/promises'
import { domainToASCII } from 'node:url'
import path from 'node:path'
class PolicyError extends Error {}
function parseArgs(argv) {
  const parsed = { allowHosts: '', flow: null, out: null, url: null }
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (!['--url', '--out', '--flow', '--allow-hosts'].includes(flag)) {
      throw new Error(`Unknown argument: ${flag}`)
    }
    if (index + 1 >= argv.length) {
      throw new Error(`Missing value for ${flag}`)
    }
    const value = argv[index + 1]
    index += 1
    if (flag === '--url') parsed.url = value
    if (flag === '--out') parsed.out = value
    if (flag === '--flow') parsed.flow = value
    if (flag === '--allow-hosts') parsed.allowHosts = value
  }
  if (!parsed.url || !parsed.out) {
    throw new Error('Usage: visual-check.mjs --url <url> --out <dir> [--flow <json>] [--allow-hosts <comma-list>]')
  }
  return parsed
}
function stripIpv6Brackets(value) {
  return value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value
}
function normalizeHostname(value) {
  const raw = stripIpv6Brackets(String(value).trim().toLowerCase())
  if (!raw) throw new PolicyError('URL hostname is empty')
  if (isIP(raw)) return raw
  const ascii = domainToASCII(raw)
  if (!ascii) throw new PolicyError(`Hostname cannot be normalized: ${value}`)
  return ascii.toLowerCase()
}
function normalizeAllowHost(value) {
  const candidate = String(value).trim()
  if (!candidate) return null
  if (candidate.includes('://')) {
    const parsed = new URL(candidate)
    if (parsed.username || parsed.password) throw new PolicyError('Allowed host entries cannot contain userinfo')
    return normalizeHostname(parsed.hostname)
  }
  if (candidate.includes('/') || candidate.includes('@')) {
    throw new PolicyError(`Invalid allowed host entry: ${candidate}`)
  }
  if (candidate.startsWith('[')) {
    const closing = candidate.indexOf(']')
    if (closing === -1) throw new PolicyError(`Invalid allowed host entry: ${candidate}`)
    return normalizeHostname(candidate.slice(0, closing + 1))
  }
  const hostWithoutPort = candidate.replace(/:\d+$/, '')
  return normalizeHostname(hostWithoutPort)
}
function parseAllowedHosts(value) {
  const hosts = new Set()
  for (const entry of String(value || '').split(',')) {
    const normalized = normalizeAllowHost(entry)
    if (normalized) hosts.add(normalized)
  }
  return hosts
}
function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}
function validateUrl(value, allowedHosts) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new PolicyError(`Invalid URL: ${value}`)
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new PolicyError(`Unsupported URL scheme: ${parsed.protocol}`)
  }
  if (parsed.username || parsed.password) {
    throw new PolicyError('URLs containing userinfo are forbidden')
  }
  const hostname = normalizeHostname(parsed.hostname)
  const ipVersion = isIP(hostname)
  if (ipVersion && hostname !== '127.0.0.1' && hostname !== '::1') {
    throw new PolicyError(`IP literal is not allowed: ${hostname}`)
  }
  const local = isLocalHost(hostname)
  if (local && parsed.protocol !== 'http:') {
    throw new PolicyError('Local visual checks require http')
  }
  if (!local && !allowedHosts.has(hostname)) {
    throw new PolicyError(`Host is not allowed: ${hostname}`)
  }
  return { hostname, local, parsed }
}
function parseFlow(raw) {
  if (raw === null) return []
  let flow
  try {
    flow = JSON.parse(raw)
  } catch {
    throw new PolicyError('--flow must be valid JSON')
  }
  if (!Array.isArray(flow)) throw new PolicyError('--flow must be a JSON array')
  for (const [index, step] of flow.entries()) {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      throw new PolicyError(`Flow step ${index + 1} must be an object`)
    }
    if (typeof step.action !== 'string' || !step.action) {
      throw new PolicyError(`Flow step ${index + 1} requires an action`)
    }
  }
  return flow
}
const readSafeActions = new Set(['goto', 'click', 'hover', 'scroll'])
const sideEffectActions = new Set(['click', 'fill', 'press', 'selectOption', 'check', 'uncheck', 'submit'])

function validateFlowPolicy(flow, initialPolicy) {
  for (const [index, step] of flow.entries()) {
    const number = index + 1
    if (step.sideEffect === true) {
      if (!initialPolicy.local) {
        throw new PolicyError(`Side-effect flow step ${number} is forbidden on non-localhost hosts`)
      }
      if (typeof step.name !== 'string' || !step.name.trim()) {
        throw new PolicyError(`Side-effect flow step ${number} must name the exact confirmed step`)
      }
      if (step.confirmed !== true) {
        throw new PolicyError(`Side-effect flow step '${step.name}' is not individually confirmed`)
      }
      if (!sideEffectActions.has(step.action)) {
        throw new PolicyError(`Unsupported side-effect action: ${step.action}`)
      }
      continue
    }
    if (!readSafeActions.has(step.action)) {
      throw new PolicyError(`Action '${step.action}' must be declared and confirmed as a side effect`)
    }
  }
}

async function loadChromium() {
  try {
    const module = await import('playwright')
    if (module.chromium) return module.chromium
  } catch {}
  try {
    const module = await import('@playwright/test')
    if (module.chromium) return module.chromium
  } catch {}
  return null
}

async function assertReadSafeClick(locator) {
  const facts = await locator.evaluate((element) => ({
    hasPopup: element.getAttribute('aria-haspopup'),
    href: element instanceof HTMLAnchorElement ? element.href : null,
    role: element.getAttribute('role'),
    tag: element.tagName.toLowerCase(),
  }))
  const safeRole = facts.role === 'tab' || facts.role === 'menuitem'
  const opensMenu = ['true', 'menu', 'listbox', 'dialog'].includes(facts.hasPopup)
  const safeTag = (facts.tag === 'a' && Boolean(facts.href)) || facts.tag === 'summary'
  if (!safeRole && !opensMenu && !safeTag) {
    throw new PolicyError('Read-safe click is limited to links, tabs, and menus')
  }
}

async function settleAndValidate(page, allowedHosts, getViolation) {
  await page.waitForLoadState('domcontentloaded', { timeout: 1500 }).catch(() => {})
  const violation = getViolation()
  if (violation) throw violation
  return validateUrl(page.url(), allowedHosts)
}

async function gotoAndValidate(page, url, allowedHosts, getViolation) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
  } catch (error) {
    const violation = getViolation()
    if (violation) throw violation
    throw error
  }
  return settleAndValidate(page, allowedHosts, getViolation)
}

async function runStep(page, step, allowedHosts, getViolation) {
  let currentPolicy = validateUrl(page.url(), allowedHosts)
  if (step.sideEffect === true && !currentPolicy.local) {
    throw new PolicyError(`Confirmed side effect '${step.name}' cannot run after navigation to a non-localhost host`)
  }

  if (step.action === 'goto') {
    if (typeof step.url !== 'string') throw new PolicyError('goto requires url')
    const target = new URL(step.url, page.url()).href
    validateUrl(target, allowedHosts)
    await gotoAndValidate(page, target, allowedHosts, getViolation)
  } else if (step.action === 'hover') {
    if (typeof step.selector !== 'string') throw new PolicyError('hover requires selector')
    await page.locator(step.selector).first().hover()
  } else if (step.action === 'scroll') {
    const x = Number.isFinite(step.x) ? step.x : 0
    const y = Number.isFinite(step.y) ? step.y : 0
    await page.evaluate(({ scrollX, scrollY }) => window.scrollBy(scrollX, scrollY), { scrollX: x, scrollY: y })
  } else if (step.action === 'click') {
    if (typeof step.selector !== 'string') throw new PolicyError('click requires selector')
    const locator = page.locator(step.selector).first()
    if (step.sideEffect !== true) await assertReadSafeClick(locator)
    await locator.click()
  } else if (step.action === 'fill') {
    if (typeof step.selector !== 'string' || typeof step.value !== 'string') throw new PolicyError('fill requires selector and value')
    await page.locator(step.selector).first().fill(step.value)
  } else if (step.action === 'press') {
    if (typeof step.selector !== 'string' || typeof step.key !== 'string') throw new PolicyError('press requires selector and key')
    await page.locator(step.selector).first().press(step.key)
  } else if (step.action === 'selectOption') {
    if (typeof step.selector !== 'string') throw new PolicyError('selectOption requires selector')
    await page.locator(step.selector).first().selectOption(step.value)
  } else if (step.action === 'check' || step.action === 'uncheck') {
    if (typeof step.selector !== 'string') throw new PolicyError(`${step.action} requires selector`)
    await page.locator(step.selector).first()[step.action]()
  } else if (step.action === 'submit') {
    if (typeof step.selector !== 'string') throw new PolicyError('submit requires selector')
    await page.locator(step.selector).first().evaluate((element) => {
      const form = element instanceof HTMLFormElement ? element : element.closest('form')
      if (!form) throw new Error('submit selector does not resolve to a form or form control')
      form.requestSubmit()
    })
  }

  currentPolicy = await settleAndValidate(page, allowedHosts, getViolation)
  return { action: step.action, name: step.name || null, url: currentPolicy.parsed.href }
}

async function captureSet(page, outDir, label, allowedHosts, getViolation) {
  const screenshots = []
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await settleAndValidate(page, allowedHosts, getViolation)
    const output = path.resolve(outDir, `${label}-${width}.png`)
    await page.screenshot({ path: output, fullPage: true })
    screenshots.push(output)
  }
  return screenshots
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const allowedHosts = parseAllowedHosts(args.allowHosts)
  const initialPolicy = validateUrl(args.url, allowedHosts)
  const flow = parseFlow(args.flow)
  validateFlowPolicy(flow, initialPolicy)

  const chromium = await loadChromium()
  if (!chromium) {
    console.error("visual-check: install 'playwright' or '@playwright/test' in this repository")
    process.exitCode = 3
    return
  }

  await mkdir(args.out, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  let page
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    let navigationViolation = null
    page.on('request', (request) => {
      if (!request.isNavigationRequest() || request.frame() !== page.mainFrame()) return
      try {
        validateUrl(request.url(), allowedHosts)
      } catch (error) {
        if (error instanceof PolicyError && !navigationViolation) navigationViolation = error
      }
    })
    page.on('framenavigated', (frame) => {
      if (frame !== page.mainFrame()) return
      try {
        validateUrl(frame.url(), allowedHosts)
      } catch (error) {
        if (error instanceof PolicyError && !navigationViolation) navigationViolation = error
      }
    })
    const getViolation = () => navigationViolation

    await gotoAndValidate(page, initialPolicy.parsed.href, allowedHosts, getViolation)
    const before = await captureSet(page, args.out, 'before', allowedHosts, getViolation)

    await page.setViewportSize({ width: 1440, height: 900 })
    const steps = []
    for (const step of flow) {
      steps.push(await runStep(page, step, allowedHosts, getViolation))
    }
    const after = await captureSet(page, args.out, 'after', allowedHosts, getViolation)

    console.log(JSON.stringify({
      after,
      before,
      finalUrl: page.url(),
      hostMode: initialPolicy.local ? 'localhost-full' : 'allowlisted-read-only',
      steps,
    }))
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  if (error instanceof PolicyError) {
    console.error(`visual-check policy violation: ${error.message}`)
    process.exitCode = 4
    return
  }
  console.error(`visual-check failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
