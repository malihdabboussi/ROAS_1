export const VISUAL_PDF_VIEWPORT_WIDTH = 960
export const VISUAL_PDF_INITIAL_HEIGHT = 1200
export const VISUAL_PDF_PAGE_WIDTH_MM = 210
export const VISUAL_PDF_PAGE_HEIGHT_MM = 297
export const VISUAL_PDF_FOOTER_SPACE_MM = 14

export async function waitForVisualDocIframe(iframe: HTMLIFrameElement): Promise<Document> {
  await new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true })
  })
  const doc = iframe.contentDocument
  if (!doc?.body) throw new Error('Visual doc failed to render')
  const images = [...doc.querySelectorAll<HTMLImageElement>('img')]
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          }),
    ),
  )
  if (doc.fonts?.ready) await doc.fonts.ready.catch(() => undefined)
  await new Promise((resolve) => window.setTimeout(resolve, 180))
  return doc
}

export function applyVisualDocPdfViewport(doc: Document): void {
  const style = doc.createElement('style')
  style.setAttribute('data-vibey-visual-pdf-export', 'true')
  style.textContent = `
    html,
    body {
      width: ${VISUAL_PDF_VIEWPORT_WIDTH}px !important;
      min-width: 0 !important;
      max-width: ${VISUAL_PDF_VIEWPORT_WIDTH}px !important;
      overflow-x: hidden !important;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    img,
    svg,
    canvas,
    video {
      max-width: 100%;
    }

    table {
      max-width: 100%;
    }
  `
  doc.head?.appendChild(style)
}

function parseCssRgbColors(value: string): Array<[number, number, number]> {
  const matches = value.matchAll(/rgba?\(([^)]+)\)/g)
  const colors: Array<[number, number, number]> = []
  for (const match of matches) {
    const parts = (match[1] ?? '')
      .split(',')
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim()))
    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
      colors.push([parts[0]!, parts[1]!, parts[2]!])
    }
  }
  return colors
}

function colorLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function pickGradientTextFallbackColor(backgroundImage: string, parentColor: string): string {
  const gradientColors = parseCssRgbColors(backgroundImage)
  if (gradientColors.length > 0) {
    const color = gradientColors.sort((a, b) => colorLuminance(b) - colorLuminance(a))[0]!
    return `rgb(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])})`
  }
  if (parentColor && parentColor !== 'rgba(0, 0, 0, 0)' && parentColor !== 'transparent') {
    return parentColor
  }
  return 'rgb(196, 181, 253)'
}

export function applyVisualDocPdfGradientTextFallback(doc: Document): void {
  const win = doc.defaultView
  if (!win) return

  for (const el of doc.querySelectorAll<HTMLElement>('body *')) {
    const style = win.getComputedStyle(el)
    const usesTextClip =
      style.backgroundClip === 'text' ||
      style.getPropertyValue('-webkit-background-clip') === 'text' ||
      style.getPropertyValue('-webkit-text-fill-color') === 'transparent' ||
      style.color === 'rgba(0, 0, 0, 0)'

    if (!usesTextClip || style.backgroundImage === 'none') continue

    const parentColor = el.parentElement ? win.getComputedStyle(el.parentElement).color : ''
    const fallbackColor = pickGradientTextFallbackColor(style.backgroundImage, parentColor)
    el.style.setProperty('background-image', 'none', 'important')
    el.style.setProperty('background', 'none', 'important')
    el.style.setProperty('background-clip', 'border-box', 'important')
    el.style.setProperty('-webkit-background-clip', 'border-box', 'important')
    el.style.setProperty('-webkit-text-fill-color', fallbackColor, 'important')
    el.style.setProperty('color', fallbackColor, 'important')
  }
}

export function getVisualPdfContentPageHeightPx(exportWidth: number): number {
  return Math.max(
    1,
    Math.floor(
      (VISUAL_PDF_PAGE_HEIGHT_MM - VISUAL_PDF_FOOTER_SPACE_MM) *
        (exportWidth / VISUAL_PDF_PAGE_WIDTH_MM),
    ),
  )
}

function canInsertVisualPdfSpacerBefore(el: HTMLElement): boolean {
  const parentTag = el.parentElement?.tagName
  return parentTag !== 'TABLE' && parentTag !== 'TBODY' && parentTag !== 'THEAD' && parentTag !== 'TR'
}

function getVisualPdfPaginationCandidates(doc: Document): HTMLElement[] {
  const selectors = [
    'main > *',
    'body > *',
    '[class*="card"]',
    '[class*="section"]',
    '[class*="panel"]',
    '[class*="callout"]',
    'section',
    'article',
    'figure',
    'blockquote',
    'pre',
    'ul',
    'ol',
    'li',
    'table',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
  ].join(',')
  return [...new Set([...doc.querySelectorAll<HTMLElement>(selectors)])]
}

export function applyVisualDocPdfPagination(doc: Document, pageHeightPx: number): void {
  const win = doc.defaultView
  if (!win) return

  const candidates = getVisualPdfPaginationCandidates(doc)
  for (const el of candidates) {
    if (!el.isConnected || !canInsertVisualPdfSpacerBefore(el)) continue
    const style = win.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') continue

    const rect = el.getBoundingClientRect()
    if (rect.width < 8 || rect.height < 18 || rect.height > pageHeightPx * 0.82) continue

    const top = rect.top + win.scrollY
    const bottom = rect.bottom + win.scrollY
    const topPage = Math.floor(top / pageHeightPx)
    const bottomPage = Math.floor((bottom - 1) / pageHeightPx)
    if (bottomPage <= topPage) continue

    const pageEnd = (topPage + 1) * pageHeightPx
    const visibleBeforeBreak = pageEnd - top

    const spacer = doc.createElement('div')
    spacer.setAttribute('data-vibey-visual-pdf-spacer', 'true')
    spacer.style.cssText = `height:${Math.ceil(visibleBeforeBreak + 24)}px;min-height:${Math.ceil(
      visibleBeforeBreak + 24,
    )}px;flex:0 0 auto;`
    el.parentElement?.insertBefore(spacer, el)
  }
}

export function getVisualDocExportSize(doc: Document): { width: number; height: number } {
  const body = doc.body
  const root = doc.documentElement
  return {
    width: Math.max(
      1,
      Math.ceil(root.scrollWidth || body.scrollWidth || root.clientWidth || body.clientWidth),
    ),
    height: Math.max(
      1,
      Math.ceil(
        Math.max(
          root.scrollHeight,
          body.scrollHeight,
          root.offsetHeight,
          body.offsetHeight,
          root.clientHeight,
          body.clientHeight,
        ),
      ),
    ),
  }
}
