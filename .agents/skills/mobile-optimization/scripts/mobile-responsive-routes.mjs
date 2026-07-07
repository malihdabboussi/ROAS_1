import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function collectRoutes(repoRoot, options) {
  const fromFile = options.pathsFile
    ? fs.readFileSync(path.resolve(repoRoot, options.pathsFile), 'utf8').split(/\r?\n/)
    : []
  const requestedRoutes = [...options.paths, ...fromFile].map(normalizeRoute).filter(Boolean)

  if (requestedRoutes.length > 0) {
    return {
      routes: Array.from(new Set(requestedRoutes)).sort(),
      skippedDynamicRoutes: [],
      routeSource: 'provided',
    }
  }

  const inferred = inferStaticRoutes(repoRoot, options.maxPages)
  return { ...inferred, routeSource: 'inferred-static-next-pages' }
}

export function resolveOutputPath(repoRoot, filePath) {
  if (!filePath) {
    const dir = path.join(os.tmpdir(), 'mobile-responsive-audit')
    fs.mkdirSync(dir, { recursive: true })
    return path.join(dir, `mobile-responsive-audit-${Date.now()}.json`)
  }

  return path.resolve(repoRoot, filePath)
}

export function routeUrl(baseUrl, route) {
  return new URL(route, baseUrl).toString()
}

export function getScreenshotPath(outputPath, route, viewportName) {
  const dir = path.join(path.dirname(outputPath), 'screenshots')
  fs.mkdirSync(dir, { recursive: true })
  const safeRoute =
    route === '/' ? 'root' : route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
  return path.join(dir, `${safeRoute}-${viewportName}.png`)
}

function normalizeRoute(value) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  if (/^https?:\/\//.test(trimmed)) {
    return new URL(trimmed).pathname || '/'
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function inferStaticRoutes(repoRoot, maxPages) {
  const appDir = path.join(repoRoot, 'apps/web/src/app')
  const routes = []
  const skippedDynamicRoutes = []

  function walk(dir) {
    if (!fs.existsSync(dir)) {
      return
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile() && entry.name === 'page.tsx') {
        const route = routeFromPage(appDir, fullPath)
        if (!route) {
          continue
        }
        if (route.includes('[')) {
          skippedDynamicRoutes.push(route)
        } else {
          routes.push(route)
        }
      }
    }
  }

  walk(appDir)

  return {
    routes: Array.from(new Set(routes)).sort().slice(0, maxPages),
    skippedDynamicRoutes: Array.from(new Set(skippedDynamicRoutes)).sort(),
  }
}

function routeFromPage(appDir, pagePath) {
  const relative = path.relative(appDir, pagePath).replace(/\\/g, '/')
  const segments = relative
    .replace(/\/page\.tsx$/, '')
    .split('/')
    .filter(Boolean)
  const routeSegments = []

  for (const segment of segments) {
    if (segment.startsWith('(') && segment.endsWith(')')) {
      continue
    }
    if (segment.startsWith('@') || segment.startsWith('_')) {
      return null
    }
    routeSegments.push(segment)
  }

  return routeSegments.length === 0 ? '/' : `/${routeSegments.join('/')}`
}
