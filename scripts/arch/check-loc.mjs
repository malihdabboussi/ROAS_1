#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ALLOWLIST_PATH = resolve(ROOT, 'scripts/arch/loc-allowlist.json')
const args = new Set(process.argv.slice(2))

const LOC_LIMITS = {
  controller: 200,
  service: 600,
  repository: 400,
  'web-container': 600,
  'web-component': 400,
}

const SCAN_ROOTS = ['apps', 'packages']
const SKIP_DIRS = new Set(['.git', '.next', '.turbo', 'coverage', 'dist', 'node_modules'])
const SKIP_FILE_RE = /(\.d\.ts|\.test\.[cm]?[jt]sx?|\.spec\.[cm]?[jt]sx?|\.stories\.[cm]?[jt]sx?)$/

function toRepoPath(path) {
  return relative(ROOT, path).split('/').join('/')
}

function readText(repoPath) {
  return readFileSync(resolve(ROOT, repoPath), 'utf8')
}

function countLines(content) {
  if (content.length === 0) return 0
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const withoutTrailingNewline = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized
  return withoutTrailingNewline.length === 0 ? 0 : withoutTrailingNewline.split('\n').length
}

function classifyLocFile(repoPath) {
  if (SKIP_FILE_RE.test(repoPath)) return null
  if (repoPath.endsWith('.controller.ts'))
    return { kind: 'controller', limit: LOC_LIMITS.controller }
  if (repoPath.endsWith('.service.ts')) return { kind: 'service', limit: LOC_LIMITS.service }
  if (repoPath.endsWith('.repository.ts')) {
    return { kind: 'repository', limit: LOC_LIMITS.repository }
  }
  if (
    repoPath.startsWith('apps/web/src/') &&
    repoPath.endsWith('.tsx') &&
    repoPath.includes('/containers/')
  ) {
    return { kind: 'web-container', limit: LOC_LIMITS['web-container'] }
  }
  if (repoPath.startsWith('apps/web/src/features/') && repoPath.endsWith('.tsx')) {
    return { kind: 'web-component', limit: LOC_LIMITS['web-component'] }
  }
  if (repoPath.startsWith('apps/web/src/components/') && repoPath.endsWith('.tsx')) {
    return { kind: 'web-component', limit: LOC_LIMITS['web-component'] }
  }
  return null
}

function walk(dir, out) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const fullPath = resolve(dir, entry)
    // throwIfNoEntry keeps broken symlinks from crashing the walk
    const stat = statSync(fullPath, { throwIfNoEntry: false })
    if (!stat) continue
    if (stat.isDirectory()) {
      walk(fullPath, out)
      continue
    }
    out.push(toRepoPath(fullPath))
  }
}

function listTrackedOrWorkingFiles() {
  const files = []
  for (const root of SCAN_ROOTS) {
    walk(resolve(ROOT, root), files)
  }
  return files.sort()
}

function listStagedFiles() {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((repoPath) => existsSync(resolve(ROOT, repoPath)))
    .sort()
}

function lineForIndex(content, index) {
  return content.slice(0, index).split(/\r\n|\r|\n/).length
}

function sourceFeatureFor(repoPath) {
  const parts = repoPath.split('/')
  if (parts[0] !== 'apps' || parts[1] !== 'web' || parts[2] !== 'src') return null
  if (parts[3] !== 'features') return null
  return parts[4] ?? null
}

function detectWebFeatureImports(repoPath) {
  const sourceFeature = sourceFeatureFor(repoPath)
  if (!sourceFeature || SKIP_FILE_RE.test(repoPath) || !/\.[jt]sx?$/.test(repoPath)) return []

  const content = readText(repoPath)
  const matches = []
  const importRe =
    /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"](@\/features\/([^/'"]+)(?:\/[^'"]*)?)['"]/g

  let match
  while ((match = importRe.exec(content)) !== null) {
    const specifier = match[1]
    const targetFeature = match[2]
    if (!specifier || !targetFeature || targetFeature === sourceFeature) continue
    matches.push({
      line: lineForIndex(content, match.index),
      specifier,
      targetFeature,
    })
  }
  return matches
}

function detectControllerSupabase(repoPath) {
  if (!repoPath.endsWith('.controller.ts')) return []
  if (!repoPath.startsWith('apps/api/src/') && !repoPath.startsWith('apps/agent-api/src/')) {
    return []
  }
  const content = readText(repoPath)
  const matches = []
  const supabaseRe = /(?:\bsupabase[!?]?|\.supabase[!?]?)\s*\.from\s*\(/g
  let match
  while ((match = supabaseRe.exec(content)) !== null) {
    matches.push({ line: lineForIndex(content, match.index) })
  }
  return matches
}

function countsBySpecifier(imports) {
  return imports.reduce((acc, item) => {
    acc[item.specifier] = (acc[item.specifier] ?? 0) + 1
    return acc
  }, {})
}

function buildBaseline(files) {
  const locFiles = {}
  const webFeatureImports = {}
  const controllerSupabaseFiles = {}

  for (const repoPath of files) {
    const locRule = classifyLocFile(repoPath)
    if (locRule) {
      const lines = countLines(readText(repoPath))
      if (lines > locRule.limit) {
        locFiles[repoPath] = {
          kind: locRule.kind,
          limit: locRule.limit,
          lines,
        }
      }
    }

    const imports = detectWebFeatureImports(repoPath)
    if (imports.length > 0) {
      webFeatureImports[repoPath] = {
        sourceFeature: sourceFeatureFor(repoPath),
        count: imports.length,
        imports: countsBySpecifier(imports),
      }
    }

    const supabaseHits = detectControllerSupabase(repoPath)
    if (supabaseHits.length > 0) {
      controllerSupabaseFiles[repoPath] = {
        count: supabaseHits.length,
      }
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    locLimits: LOC_LIMITS,
    files: Object.fromEntries(Object.entries(locFiles).sort(([a], [b]) => a.localeCompare(b))),
    webFeatureImports: Object.fromEntries(
      Object.entries(webFeatureImports).sort(([a], [b]) => a.localeCompare(b)),
    ),
    controllerSupabaseFiles: Object.fromEntries(
      Object.entries(controllerSupabaseFiles).sort(([a], [b]) => a.localeCompare(b)),
    ),
  }
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) {
    return {
      version: 1,
      locLimits: LOC_LIMITS,
      files: {},
      webFeatureImports: {},
      controllerSupabaseFiles: {},
    }
  }
  return JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
}

function checkLoc(files, allowlist, errors) {
  const filesToCheck = new Set(files)
  for (const repoPath of files) {
    const rule = classifyLocFile(repoPath)
    if (!rule) continue
    const lines = countLines(readText(repoPath))
    const baseline = allowlist.files?.[repoPath]

    if (baseline) {
      if (lines <= rule.limit) {
        errors.push(
          `${repoPath}: now ${lines}/${rule.limit} LOC; remove it from loc-allowlist.json`,
        )
      } else if (lines > baseline.lines) {
        errors.push(`${repoPath}: allowlisted LOC grew from ${baseline.lines} to ${lines}`)
      }
      continue
    }

    if (lines > rule.limit) {
      errors.push(`${repoPath}: ${lines} LOC exceeds ${rule.kind} limit ${rule.limit}`)
    }
  }

  if (!args.has('--staged')) {
    for (const repoPath of Object.keys(allowlist.files ?? {})) {
      if (!filesToCheck.has(repoPath)) {
        errors.push(
          `${repoPath}: allowlisted file no longer exists; remove it from loc-allowlist.json`,
        )
      }
    }
  }
}

function checkWebFeatureImports(files, allowlist, errors) {
  const currentFiles = new Set(files)
  for (const repoPath of files) {
    const imports = detectWebFeatureImports(repoPath)
    const baseline = allowlist.webFeatureImports?.[repoPath]
    if (imports.length === 0) {
      if (baseline && !args.has('--staged')) {
        errors.push(`${repoPath}: cross-feature imports removed; remove it from loc-allowlist.json`)
      }
      continue
    }

    if (!baseline) {
      for (const item of imports) {
        errors.push(
          `${repoPath}:${item.line}: new cross-feature import ${item.specifier}; move shared code to @/lib or @/components`,
        )
      }
      continue
    }

    const currentCounts = countsBySpecifier(imports)
    for (const [specifier, count] of Object.entries(currentCounts)) {
      const allowed = baseline.imports?.[specifier] ?? 0
      if (allowed === 0) {
        errors.push(`${repoPath}: new cross-feature import ${specifier}`)
      } else if (count > allowed) {
        errors.push(
          `${repoPath}: cross-feature import ${specifier} grew from ${allowed} to ${count}`,
        )
      }
    }
    if (imports.length > baseline.count) {
      errors.push(
        `${repoPath}: cross-feature import count grew from ${baseline.count} to ${imports.length}`,
      )
    }
  }

  if (!args.has('--staged')) {
    for (const repoPath of Object.keys(allowlist.webFeatureImports ?? {})) {
      if (!currentFiles.has(repoPath)) {
        errors.push(
          `${repoPath}: cross-feature allowlisted file missing; remove it from loc-allowlist.json`,
        )
      }
    }
  }
}

function checkControllerSupabase(files, allowlist, errors) {
  const currentFiles = new Set(files)
  for (const repoPath of files) {
    const hits = detectControllerSupabase(repoPath)
    const baseline = allowlist.controllerSupabaseFiles?.[repoPath]
    if (hits.length === 0) {
      if (baseline && !args.has('--staged')) {
        errors.push(
          `${repoPath}: controller Supabase access removed; remove it from loc-allowlist.json`,
        )
      }
      continue
    }

    if (!baseline) {
      for (const hit of hits) {
        errors.push(
          `${repoPath}:${hit.line}: direct supabase.from in controller; move data access to service/repository`,
        )
      }
      continue
    }

    if (hits.length > baseline.count) {
      errors.push(
        `${repoPath}: controller Supabase access grew from ${baseline.count} to ${hits.length}`,
      )
    }
  }

  if (!args.has('--staged')) {
    for (const repoPath of Object.keys(allowlist.controllerSupabaseFiles ?? {})) {
      if (!currentFiles.has(repoPath)) {
        errors.push(
          `${repoPath}: controller Supabase allowlisted file missing; remove it from loc-allowlist.json`,
        )
      }
    }
  }
}

function readAllowlistFromGit() {
  const baseRef = process.env.ARCH_LOC_BASE_REF
    ? process.env.ARCH_LOC_BASE_REF
    : process.env.GITHUB_BASE_REF
      ? `origin/${process.env.GITHUB_BASE_REF}`
      : 'origin/main'

  try {
    const output = execSync(`git show ${baseRef}:scripts/arch/loc-allowlist.json`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(output)
  } catch {
    return null
  }
}

function checkAllowlistOnlyShrinks(current, errors, options = {}) {
  const enabled = options.enabled ?? args.has('--check-allowlist-shrink')
  if (!enabled) return
  const base = options.baseAllowlist ?? readAllowlistFromGit()
  if (!base) return

  for (const section of ['files', 'webFeatureImports', 'controllerSupabaseFiles']) {
    const baseKeys = new Set(Object.keys(base[section] ?? {}))
    for (const repoPath of Object.keys(current[section] ?? {})) {
      if (!baseKeys.has(repoPath)) {
        errors.push(`${repoPath}: new ${section} allowlist entry; allowlists may only shrink`)
      }
    }
  }
}

function main() {
  const files = args.has('--staged') ? listStagedFiles() : listTrackedOrWorkingFiles()

  if (args.has('--write-baseline')) {
    const baseline = buildBaseline(files)
    mkdirSync(dirname(ALLOWLIST_PATH), { recursive: true })
    writeFileSync(ALLOWLIST_PATH, `${JSON.stringify(baseline, null, 2)}\n`)
    console.log(
      `Wrote ${toRepoPath(ALLOWLIST_PATH)}: ${Object.keys(baseline.files).length} LOC, ` +
        `${Object.keys(baseline.webFeatureImports).length} web import, ` +
        `${Object.keys(baseline.controllerSupabaseFiles).length} controller Supabase entries`,
    )
    return
  }

  const allowlist = loadAllowlist()
  const errors = []
  checkAllowlistOnlyShrinks(allowlist, errors)
  checkLoc(files, allowlist, errors)
  checkWebFeatureImports(files, allowlist, errors)
  checkControllerSupabase(files, allowlist, errors)

  if (errors.length > 0) {
    console.error('Architecture gate failed:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exit(1)
  }

  console.log(
    `Architecture gate passed (${files.length} file${files.length === 1 ? '' : 's'} checked)`,
  )
}

const isCli = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false

if (isCli) {
  main()
}

export {
  buildBaseline,
  checkAllowlistOnlyShrinks,
  checkControllerSupabase,
  checkLoc,
  checkWebFeatureImports,
  classifyLocFile,
  countLines,
  detectControllerSupabase,
  detectWebFeatureImports,
}
