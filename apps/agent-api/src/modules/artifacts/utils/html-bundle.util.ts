import { countOccurrences } from './artifact-patch.util'

/**
 * Shared helpers for HTML-first artifact file bundles.
 * Used by presentations (presentation_files) and funnels (funnel_files).
 */

export interface BundleFileInput {
  path: string
  content: string
  role: string
}

export function sanitizeBundleFilePath(path: unknown, label = 'bundle'): string {
  const value = String(path ?? '').trim()
  if (
    !value ||
    value.startsWith('/') ||
    /^[A-Za-z]:/.test(value) ||
    value.includes('\\') ||
    value.split('/').includes('..')
  ) {
    throw new Error(`Invalid ${label} file path`)
  }
  return value
}

export function getBundleMimeType(path: string): string {
  if (path.endsWith('.html') || path.endsWith('.htm')) return 'text/html'
  if (path.endsWith('.css')) return 'text/css'
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'text/javascript'
  if (path.endsWith('.json')) return 'application/json'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  return 'text/plain'
}

export function inferBundleFileRole(path: string, role?: unknown): string {
  if (typeof role === 'string' && role.trim()) return role
  return path === 'index.html' ? 'entry' : 'source'
}

export function normalizeBundleFiles(files: unknown, label = 'bundle'): BundleFileInput[] {
  const list = Array.isArray(files) ? files : []
  return list.map((file) => {
    const obj = file as Record<string, unknown>
    const path = sanitizeBundleFilePath(obj.path, label)
    const content = typeof obj.content === 'string' ? obj.content : ''
    if (!content.trim()) throw new Error(`${label} file ${path} content is required`)
    return {
      path,
      content,
      role: inferBundleFileRole(path, obj.role),
    }
  })
}

export function bundleFileSizeBytes(content: string): number {
  return new TextEncoder().encode(content).length
}

export type CandidateEditResult =
  | { status: 'applied'; nextContent: string; candidate: string }
  | { status: 'ambiguous'; candidate: string; matches: number }
  | { status: 'not_found' }

/**
 * Try each candidate snippet in order; apply the replacement at the first
 * candidate that matches exactly once. Multiple matches surface as ambiguous
 * so the caller can ask for clarification instead of guessing.
 */
export function applyUniqueCandidateEdit(
  content: string,
  candidates: string[],
  replacement: string,
): CandidateEditResult {
  for (const candidate of candidates) {
    if (!candidate.trim()) continue
    const matches = countOccurrences(content, candidate)
    if (matches === 1) {
      return {
        status: 'applied',
        nextContent: content.replace(candidate, replacement),
        candidate,
      }
    }
    if (matches > 1) {
      return { status: 'ambiguous', candidate, matches }
    }
  }
  return { status: 'not_found' }
}

const TWEAK_MARKER = '/*EDITMODE-BEGIN*/'

export function bundleFileHasTweaks(content: string): boolean {
  return content.includes(TWEAK_MARKER)
}

/**
 * Wrap an exact source snippet's first tag with a persistent comment anchor.
 */
export function buildAnchorReplacement(find: string, anchorId: string): string {
  return find.replace(/<([a-zA-Z0-9-]+)(\s|>)/, `<$1 data-comment-anchor="${anchorId}"$2`)
}

export interface BundleValidationResult {
  errors: string[]
  warnings: string[]
}

function stripCssCommentsAndStrings(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
}

/**
 * Structural CSS check: unbalanced braces are the most common way a broken
 * stylesheet silently unstyles a whole page. Returns an error message or null.
 */
export function validateCssContent(path: string, content: string): string | null {
  const stripped = stripCssCommentsAndStrings(content)
  let depth = 0
  for (const char of stripped) {
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth < 0) return `${path}: unexpected '}' — CSS braces are unbalanced`
    }
  }
  if (depth > 0) {
    return `${path}: ${depth} unclosed '{' — the stylesheet is truncated or malformed`
  }
  const tail = stripped.trim().slice(-1)
  if (stripped.trim().length > 0 && tail !== '}' && tail !== ';') {
    return `${path}: stylesheet does not end at a complete rule — it looks truncated`
  }
  return null
}

function isLocalReference(href: string): boolean {
  const value = href.trim()
  if (!value) return false
  return !/^(https?:)?\/\//i.test(value) && !value.startsWith('data:') && !value.startsWith('#')
}

function normalizeReferencePath(href: string): string {
  return href.trim().replace(/^\.\//, '')
}

/**
 * Per-file "syntax" check — the compile-error tier. Files failing this are
 * never stored: a broken stylesheet or a non-document entry can only make the
 * page worse. Returns the error message or null.
 */
export function validateBundleFileContent(path: string, content: string): string | null {
  if (path === 'index.html') {
    if (/\bexport\s+default\b|\bfrom\s+['"]react['"]/.test(content)) {
      return 'index.html must be a plain HTML document, not TSX/React source. Write complete HTML with <!doctype html>.'
    }
    if (!/<!doctype\s+html/i.test(content)) {
      return 'index.html must start with <!doctype html> (complete HTML document).'
    }
    if (!/<body[\s>]/i.test(content)) {
      return 'index.html must contain a <body> element.'
    }
    const inlineStyles = [...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    for (const [index, match] of inlineStyles.entries()) {
      const cssError = validateCssContent(`index.html <style> block ${index + 1}`, match[1] ?? '')
      if (cssError) return cssError
    }
    return null
  }
  if (path.endsWith('.css')) {
    return validateCssContent(path, content)
  }
  return null
}

/**
 * Whole-bundle lint — the after-save tier, like running a linter after the
 * code compiles. Reference problems (stylesheet/script pointing at a file
 * that doesn't exist) and SEO gaps don't block the save; they come back as
 * errors/warnings on every save response so the agent fixes them with cheap
 * single-file writes until the lint is clean.
 */
export function lintFunnelBundle(input: {
  files: BundleFileInput[]
  /** Resolvable paths beyond the page files: shared files, attached assets. */
  knownPaths?: string[]
}): BundleValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const entry = input.files.find((file) => file.path === 'index.html')

  if (!entry) {
    return {
      errors: ['The page has no index.html entry file — it cannot render. Write one.'],
      warnings,
    }
  }

  if (!/<title[\s>]/i.test(entry.content)) {
    warnings.push('index.html has no <title> — the page will miss its SEO title.')
  }
  if (!/<meta[^>]+name=["']description["']/i.test(entry.content)) {
    warnings.push('index.html has no <meta name="description"> — add one for SEO.')
  }

  const resolvable = new Set<string>([
    ...input.files.map((file) => file.path),
    ...(input.knownPaths ?? []),
  ])

  const linkRefs = [...entry.content.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)].filter(
    (match) => /rel=["']stylesheet["']/i.test(match[0]!),
  )
  for (const match of linkRefs) {
    const href = match[1]!
    if (isLocalReference(href) && !resolvable.has(normalizeReferencePath(href))) {
      errors.push(
        `index.html links stylesheet "${href}" but that file does not exist — the page renders unstyled until you write it (write_funnel_file) or fix the href.`,
      )
    }
  }
  const scriptRefs = [...entry.content.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)]
  for (const match of scriptRefs) {
    const src = match[1]!
    if (isLocalReference(src) && !resolvable.has(normalizeReferencePath(src))) {
      errors.push(
        `index.html references script "${src}" but that file does not exist — write it or remove the tag.`,
      )
    }
  }

  return { errors, warnings }
}

/**
 * Strict whole-bundle validation: per-file syntax + lint combined, all
 * blocking. Used for full-replace of an existing page, where overwriting a
 * working bundle with a broken one is never acceptable.
 */
export function validateFunnelBundleFiles(input: {
  files: BundleFileInput[]
  knownPaths?: string[]
}): BundleValidationResult {
  const errors: string[] = []
  for (const file of input.files) {
    const fileError = validateBundleFileContent(file.path, file.content)
    if (fileError) errors.push(fileError)
  }
  const lint = lintFunnelBundle(input)
  return { errors: [...errors, ...lint.errors], warnings: lint.warnings }
}
