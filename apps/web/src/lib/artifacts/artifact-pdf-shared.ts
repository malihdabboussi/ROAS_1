import { resolveMarketingSiteUrl, ROAS_MARKETING_URL } from '@/lib/platform/platform-urls'
import { normalizeEmDashToHyphen } from './artifact-text-normalization'

/**
 * Shared DOM + CSS for html2pdf exports (offers, avatars, etc.).
 */

const TEXT_MAIN = '#111827'
const TEXT_BODY = '#374151'
const TEXT_MUTED = '#6b7280'
const RULE = '#e5e7eb'

const DEFAULT_PLATFORM_URL = ROAS_MARKETING_URL

export const ARTIFACT_PDF_SIDE_MARGIN_MM = 12
export const ARTIFACT_PDF_CONTENT_WIDTH_MM = 210 - ARTIFACT_PDF_SIDE_MARGIN_MM * 2

/**
 * html2pdf.js `pagebreaks.js` uses viewport `getBoundingClientRect()` vs `pxPageHeight` (TODO in upstream: subtract container offset).
 * `avoid-all` marks every node as avoid → spurious `before` spacers (~full page) and an almost-empty first page (header only) on large offer DOMs.
 * Rely on `css` (break-inside from our PDF styles) + explicit selectors + chunked text in `appendPdfFieldValue`.
 */
export const ARTIFACT_HTML2PDF_PAGEBREAK = {
  mode: ['css', 'legacy'] as const,
  avoid: [
    '.pdf-header',
    '.pdf-hero-card',
    '.pdf-section-title',
    '.pdf-field',
    '.pdf-field-label',
    '.pdf-field-paragraph',
    '.pdf-field-list',
    '.pdf-field-list-row',
    '.pdf-nested',
    '.pdf-nested-block',
  ] as const,
}

const PDF_LONG_STRING_CHUNK = 900

function appendPdfParagraph(parent: HTMLElement, content: string): void {
  const p = document.createElement('p')
  p.className = 'pdf-field-paragraph'
  p.style.whiteSpace = 'pre-wrap'
  p.textContent = content
  parent.appendChild(p)
}

/** Split long lines at word boundaries so html2pdf pagebreak can keep each chunk on one page. */
function chunkPlainTextForPdf(raw: string): string[] {
  const text = normalizeEmDashToHyphen(raw)
  const out: string[] = []
  const blocks = text.split(/\n+/)
  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    if (trimmed.length <= PDF_LONG_STRING_CHUNK) {
      out.push(trimmed)
      continue
    }
    let rest = trimmed
    while (rest.length > 0) {
      if (rest.length <= PDF_LONG_STRING_CHUNK) {
        out.push(rest)
        break
      }
      let cut = rest.lastIndexOf(' ', PDF_LONG_STRING_CHUNK)
      if (cut < PDF_LONG_STRING_CHUNK / 2) cut = PDF_LONG_STRING_CHUNK
      const piece = rest.slice(0, cut).trim()
      if (piece) out.push(piece)
      rest = rest.slice(cut).trim()
    }
  }
  return out
}

/** One `<p>` per block; long unbroken strings chunked so each node can stay under one canvas page slice. */
function appendPlainTextAsPdfParagraphs(parent: HTMLElement, raw: string): void {
  for (const piece of chunkPlainTextForPdf(raw)) {
    appendPdfParagraph(parent, piece)
  }
}

export function formatSnakeCaseLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function isPdfFieldEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'string' && value.trim() === '') return true
  return false
}

export function getArtifactPdfPlatformUrl(): string {
  if (typeof process === 'undefined') return DEFAULT_PLATFORM_URL
  const fromEnv =
    process.env.NEXT_PUBLIC_VIBEY_PLATFORM_URL?.trim() ||
    process.env.NEXT_PUBLIC_GOVIBEY_URL?.trim()
  return fromEnv || resolveMarketingSiteUrl()
}

export function appendPdfFieldValue(parent: HTMLElement, value: unknown): void {
  if (Array.isArray(value)) {
    const unique = [
      ...new Set(
        value
          .map((item) =>
            normalizeEmDashToHyphen(
              String(item)
                .replace(/^[\s•\-–—*]+/, '')
                .trim(),
            ),
          )
          .filter(Boolean),
      ),
    ]
    const list = document.createElement('div')
    list.className = 'pdf-field-list'
    list.setAttribute('role', 'list')
    for (const item of unique) {
      const pieces = chunkPlainTextForPdf(item)
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i] ?? ''
        const row = document.createElement('div')
        row.className = 'pdf-field-list-row'
        row.setAttribute('role', 'listitem')
        const bullet = document.createElement('span')
        bullet.className = 'pdf-field-list-bullet'
        bullet.setAttribute('aria-hidden', 'true')
        bullet.textContent = i === 0 ? '•' : '\u2003'
        const text = document.createElement('span')
        text.className = 'pdf-field-list-text'
        text.style.whiteSpace = 'pre-wrap'
        text.textContent = piece
        row.appendChild(bullet)
        row.appendChild(text)
        list.appendChild(row)
      }
    }
    parent.appendChild(list)
    return
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    const wrap = document.createElement('div')
    wrap.className = 'pdf-nested'
    for (const [k, v] of Object.entries(obj)) {
      if (isPdfFieldEmpty(v)) continue
      const block = document.createElement('div')
      block.className = 'pdf-nested-block'
      const subLabel = document.createElement('p')
      subLabel.className = 'pdf-nested-label'
      subLabel.textContent = formatSnakeCaseLabel(k)
      block.appendChild(subLabel)
      appendPdfFieldValue(block, v)
      wrap.appendChild(block)
    }
    parent.appendChild(wrap)
    return
  }
  appendPlainTextAsPdfParagraphs(parent, String(value))
}

export function buildArtifactPdfStyles(scopeClass: string, contentWidthMm: number): string {
  const w = `${contentWidthMm}mm`
  return [
    `.${scopeClass}{box-sizing:border-box;width:${w};max-width:${w};background:#fff!important;color:${TEXT_MAIN}!important;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important;font-size:12px;line-height:1.55;padding:0 0 22px;overflow:visible;}`,
    `.${scopeClass} *{box-sizing:border-box;}`,
    `.${scopeClass} .pdf-header{padding:0 0 14px;margin:0 0 18px;border-bottom:1px solid ${RULE};break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} .pdf-brand-row{display:flex;align-items:center;justify-content:center;margin:0 auto 16px;width:100%;}`,
    `.${scopeClass} .pdf-brand-row img{height:42px;width:auto;display:block;}`,
    `.${scopeClass} .pdf-doc-title{font-size:22px;font-weight:700;line-height:1.25;margin:0 0 6px;color:${TEXT_MAIN}!important;}`,
    `.${scopeClass} .pdf-doc-subtitle{margin:0;font-size:11px;color:${TEXT_MUTED}!important;}`,
    `.${scopeClass} main{padding:0;}`,
    `.${scopeClass} .pdf-section{margin:0 0 20px;}`,
    `.${scopeClass} .pdf-section-title{font-size:14px;font-weight:700;margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid ${RULE};color:${TEXT_MAIN}!important;break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} .pdf-section:first-of-type .pdf-section-title{margin-top:0;}`,
    `.${scopeClass} .pdf-field{margin:0 0 14px;padding:0;break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} .pdf-field-label{font-size:11px;font-weight:500;text-transform:none;letter-spacing:0;color:${TEXT_MUTED}!important;margin:0 0 4px;break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} .pdf-field-body{font-size:12px;color:${TEXT_BODY}!important;}`,
    `.${scopeClass} .pdf-field-paragraph{margin:0 0 6px;padding-bottom:3px;font-size:12px;line-height:1.6;color:${TEXT_BODY}!important;break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} .pdf-field-list{margin:4px 0 0;display:block;color:${TEXT_BODY}!important;}`,
    `.${scopeClass} .pdf-field-list-row{display:flex;gap:6px;align-items:flex-start;margin-bottom:4px;padding-bottom:3px;color:${TEXT_BODY}!important;break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} .pdf-field-list-row:last-child{margin-bottom:0;}`,
    `.${scopeClass} .pdf-field-list-bullet{flex-shrink:0;width:1em;text-align:center;line-height:1.55;font-size:0.72em;padding-top:0.28em;color:${TEXT_BODY}!important;}`,
    `.${scopeClass} .pdf-field-list-text{flex:1;min-width:0;font-size:12px;line-height:1.6;color:${TEXT_BODY}!important;}`,
    `.${scopeClass} .pdf-nested{margin-top:4px;}`,
    `.${scopeClass} .pdf-nested-block{margin-bottom:10px;break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} .pdf-nested-label{font-size:11px;font-weight:500;margin:0 0 4px;color:${TEXT_MUTED}!important;break-inside:avoid;page-break-inside:avoid;}`,
  ].join('\n')
}

export function appendArtifactPdfHeader(
  root: HTMLElement,
  docTitle: string,
  subtitle: string,
): void {
  const header = document.createElement('header')
  header.className = 'pdf-header'

  const brandRow = document.createElement('div')
  brandRow.className = 'pdf-brand-row'
  const logo = document.createElement('img')
  logo.alt = 'Vibey'
  logo.crossOrigin = 'anonymous'
  logo.src = `${typeof window !== 'undefined' ? window.location.origin : ''}/Logos/logov2_transperent.png`
  brandRow.appendChild(logo)
  header.appendChild(brandRow)

  const h1 = document.createElement('h1')
  h1.className = 'pdf-doc-title'
  h1.textContent = normalizeEmDashToHyphen(docTitle)
  header.appendChild(h1)

  const sub = document.createElement('p')
  sub.className = 'pdf-doc-subtitle'
  sub.textContent = normalizeEmDashToHyphen(subtitle)
  header.appendChild(sub)

  root.appendChild(header)
}

export function appendPdfFieldBlock(main: HTMLElement, label: string, value: unknown): void {
  if (isPdfFieldEmpty(value)) return
  const block = document.createElement('div')
  block.className = 'pdf-field'
  const lbl = document.createElement('h3')
  lbl.className = 'pdf-field-label'
  lbl.textContent = label
  block.appendChild(lbl)
  const body = document.createElement('div')
  body.className = 'pdf-field-body'
  appendPdfFieldValue(body, value)
  block.appendChild(body)
  main.appendChild(block)
}
