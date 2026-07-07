export const PRESENTATION_REFLOW_PATTERNS: Array<{
  pattern: RegExp
  message: string
  fix: string
}> = [
  {
    pattern: /min-height\s*:\s*100vh/i,
    message: 'Slide layout uses min-height: 100vh, which reflows between preview, thumbnails, and export.',
    fix: 'Use fixed slide height: 720px.',
  },
  {
    pattern: /height\s*:\s*100vh/i,
    message: 'Slide layout uses height: 100vh, which depends on the iframe viewport.',
    fix: 'Use fixed slide height: 720px.',
  },
  {
    pattern: /width\s*:\s*100vw/i,
    message: 'Deck layout uses width: 100vw, which depends on the iframe viewport.',
    fix: 'Use fixed deck and slide width: 1280px.',
  },
  {
    pattern: /repeat\s*\(\s*auto-(?:fit|fill)/i,
    message: 'Slide grid uses auto-fit or auto-fill, so columns can collapse on different surfaces.',
    fix: 'Use fixed tracks such as repeat(3, 1fr) or named pixel/fr tracks.',
  },
  {
    pattern: /minmax\s*\(/i,
    message: 'Slide grid uses minmax(), which can change composition across surfaces.',
    fix: 'Use fixed slide grids with known columns.',
  },
  {
    pattern: /font-size\s*:[^;{}]*(?:\bvw\b|clamp\s*\([^)]*\bvw\b)/i,
    message: 'Slide typography scales with viewport width.',
    fix: 'Use fixed slide typography sizes.',
  },
]

function isLocalReference(value: string): boolean {
  const ref = value.trim()
  return (
    !!ref &&
    !/^(https?:)?\/\//i.test(ref) &&
    !ref.startsWith('data:') &&
    !ref.startsWith('#') &&
    !ref.startsWith('mailto:') &&
    !ref.startsWith('tel:')
  )
}

function normalizeReferencePath(value: string): string {
  return value.trim().replace(/^\.\//, '').split('#')[0]!.split('?')[0]!
}

export function collectPresentationLocalReferences(
  html: string,
  css: string,
): Array<{ path: string; source: string }> {
  const refs: Array<{ path: string; source: string }> = []
  const htmlPatterns = [
    /<link[^>]+href\s*=\s*(["'])([^"']+)\1[^>]*>/gi,
    /<script[^>]+src\s*=\s*(["'])([^"']+)\1[^>]*>/gi,
    /<(?:img|source|video|audio)[^>]+src\s*=\s*(["'])([^"']+)\1[^>]*>/gi,
  ]

  for (const pattern of htmlPatterns) {
    for (const match of html.matchAll(pattern)) {
      const ref = match[2] ?? ''
      if (isLocalReference(ref)) refs.push({ path: normalizeReferencePath(ref), source: ref })
    }
  }

  for (const match of css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
    const ref = match[2] ?? ''
    if (isLocalReference(ref)) refs.push({ path: normalizeReferencePath(ref), source: ref })
  }

  return refs
}
