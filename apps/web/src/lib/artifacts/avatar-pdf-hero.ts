import { appendPdfFieldValue, isPdfFieldEmpty } from './artifact-pdf-shared'
import {
  DEMO_BOTTOM_SORT,
  DEMO_TOP_SORT,
  formatDemoKey,
  isSimpleDemoValue,
  partitionDemographics,
  sortDemoEntries,
} from './avatar-demographics-hero.layout'

const RULE = '#e5e7eb'
const TEXT_MUTED = '#6b7280'
const TEXT_BODY = '#374151'

/** ~40×40 tailwind h-40 w-40 at ~96dpi */
const PORTRAIT_PX = 106

function resolvePortraitSrc(url: string): string {
  const t = url.trim()
  if (!t) return t
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:')) return t
  if (typeof window !== 'undefined' && t.startsWith('/')) return `${window.location.origin}${t}`
  return t
}

function appendPortraitCell(parent: HTMLElement, avatarImage: string | undefined): void {
  const cell = document.createElement('div')
  cell.className = 'pdf-hero-portrait'
  if (avatarImage && avatarImage.trim() !== '') {
    const img = document.createElement('img')
    img.alt = 'Avatar portrait'
    img.crossOrigin = 'anonymous'
    img.src = resolvePortraitSrc(avatarImage)
    cell.appendChild(img)
  } else {
    const ph = document.createElement('div')
    ph.className = 'pdf-hero-portrait-placeholder'
    ph.textContent = 'No portrait'
    cell.appendChild(ph)
  }
  parent.appendChild(cell)
}

function appendHeroStatGrid(parent: HTMLElement, entries: [string, unknown][]): void {
  if (entries.length === 0) return
  const grid = document.createElement('div')
  grid.className = 'pdf-hero-stats'
  for (const [k, v] of entries) {
    const cell = document.createElement('div')
    cell.className = 'pdf-hero-stat'
    const lbl = document.createElement('p')
    lbl.className = 'pdf-hero-stat-label'
    lbl.textContent = formatDemoKey(k)
    const val = document.createElement('p')
    val.className = 'pdf-hero-stat-value'
    val.textContent = String(v)
    cell.appendChild(lbl)
    cell.appendChild(val)
    grid.appendChild(cell)
  }
  parent.appendChild(grid)
}

function appendHeroLabeledBlock(parent: HTMLElement, label: string, value: unknown): void {
  if (isPdfFieldEmpty(value)) return
  const block = document.createElement('div')
  block.className = 'pdf-field'
  const lbl = document.createElement('h3')
  lbl.className = 'pdf-field-label'
  lbl.textContent = label
  const body = document.createElement('div')
  body.className = 'pdf-field-body'
  appendPdfFieldValue(body, value)
  block.appendChild(lbl)
  block.appendChild(body)
  parent.appendChild(block)
}

/**
 * Opening “hero” block: portrait + demographics, matching `AvatarPreview` `HeroCard` structure.
 * Omits separate “Portrait URL” text when an image is shown.
 */
export function appendAvatarPdfHero(section: HTMLElement, pd: Record<string, unknown>): boolean {
  const demoRaw = pd.demographics
  const demographicsObj =
    demoRaw && typeof demoRaw === 'object' && !Array.isArray(demoRaw)
      ? (demoRaw as Record<string, unknown>)
      : undefined
  const demographicsArr = Array.isArray(demoRaw) ? demoRaw : null
  const avatarImage = typeof pd.avatar_image === 'string' ? pd.avatar_image : undefined

  if (!demographicsObj && !demographicsArr && !(avatarImage && avatarImage.trim() !== '')) {
    return false
  }

  const card = document.createElement('div')
  card.className = 'pdf-hero-card'

  if (demographicsArr) {
    const topCol = document.createElement('div')
    topCol.className = 'pdf-hero-array-top'
    const row = document.createElement('div')
    row.className = 'pdf-hero-row pdf-hero-row-array'
    appendPortraitCell(row, avatarImage)
    topCol.appendChild(row)
    const demoTitle = document.createElement('p')
    demoTitle.className = 'pdf-hero-section-title'
    demoTitle.textContent = 'Demographics'
    topCol.appendChild(demoTitle)
    const demoBody = document.createElement('div')
    demoBody.className = 'pdf-field-body'
    appendPdfFieldValue(demoBody, demographicsArr)
    topCol.appendChild(demoBody)
    card.appendChild(topCol)
    section.appendChild(card)
    return true
  }

  if (!demographicsObj) {
    const only = document.createElement('div')
    only.className = 'pdf-hero-portrait-only'
    appendPortraitCell(only, avatarImage)
    card.appendChild(only)
    section.appendChild(card)
    return true
  }

  const { top, bottom, other } = partitionDemographics(demographicsObj)
  const topSimple = sortDemoEntries(
    top.filter(([, v]) => isSimpleDemoValue(v)),
    DEMO_TOP_SORT,
  )
  const topComplex = sortDemoEntries(
    top.filter(([, v]) => !isSimpleDemoValue(v)),
    DEMO_TOP_SORT,
  )
  const bottomSimple = sortDemoEntries(
    bottom.filter(([, v]) => isSimpleDemoValue(v)),
    DEMO_BOTTOM_SORT,
  )
  const bottomComplex = sortDemoEntries(
    bottom.filter(([, v]) => !isSimpleDemoValue(v)),
    DEMO_BOTTOM_SORT,
  )
  const otherSimple = sortDemoEntries(
    other.filter(([, v]) => isSimpleDemoValue(v)),
    [],
  )
  const otherComplex = sortDemoEntries(
    other.filter(([, v]) => !isSimpleDemoValue(v)),
    [],
  )

  const hasLowerBand =
    topComplex.length > 0 ||
    bottomSimple.length > 0 ||
    bottomComplex.length > 0 ||
    otherSimple.length > 0 ||
    otherComplex.length > 0

  const row = document.createElement('div')
  row.className = 'pdf-hero-row'
  appendPortraitCell(row, avatarImage)
  const statsWrap = document.createElement('div')
  statsWrap.className = 'pdf-hero-stats-wrap'
  appendHeroStatGrid(statsWrap, topSimple)
  row.appendChild(statsWrap)
  card.appendChild(row)

  if (hasLowerBand) {
    const lower = document.createElement('div')
    lower.className = 'pdf-hero-lower'
    for (const [k, v] of topComplex) {
      appendHeroLabeledBlock(lower, formatDemoKey(k), v)
    }
    appendHeroStatGrid(lower, bottomSimple)
    for (const [k, v] of bottomComplex) {
      appendHeroLabeledBlock(lower, formatDemoKey(k), v)
    }
    appendHeroStatGrid(lower, otherSimple)
    for (const [k, v] of otherComplex) {
      appendHeroLabeledBlock(lower, formatDemoKey(k), v)
    }
    card.appendChild(lower)
  }

  section.appendChild(card)
  return true
}

export function buildAvatarPdfHeroStyles(scopeClass: string): string {
  return [
    `.${scopeClass} .pdf-hero-card{border:1px solid ${RULE};border-radius:10px;padding:14px 16px;margin:0 0 18px;break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} .pdf-hero-row{display:flex;flex-direction:row;align-items:flex-start;gap:18px;margin:0;}`,
    `.${scopeClass} .pdf-hero-row-array{justify-content:center;}`,
    `.${scopeClass} .pdf-hero-array-top{display:block;}`,
    `.${scopeClass} .pdf-hero-portrait-only{display:flex;justify-content:center;padding:4px 0 8px;}`,
    `.${scopeClass} .pdf-hero-portrait{flex-shrink:0;width:${PORTRAIT_PX}px;}`,
    `.${scopeClass} .pdf-hero-portrait img{display:block;width:${PORTRAIT_PX}px;height:${PORTRAIT_PX}px;object-fit:cover;border-radius:8px;}`,
    `.${scopeClass} .pdf-hero-portrait-placeholder{width:${PORTRAIT_PX}px;height:${PORTRAIT_PX}px;border-radius:8px;background:#f3f4f6;border:1px solid ${RULE};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;color:${TEXT_MUTED}!important;text-align:center;padding:8px;box-sizing:border-box;}`,
    `.${scopeClass} .pdf-hero-stats-wrap{flex:1;min-width:0;}`,
    `.${scopeClass} .pdf-hero-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;}`,
    `.${scopeClass} .pdf-hero-stat-label{font-size:11px;font-weight:500;color:${TEXT_MUTED}!important;margin:0 0 3px;}`,
    `.${scopeClass} .pdf-hero-stat-value{font-size:12px;color:${TEXT_BODY}!important;margin:0;line-height:1.45;}`,
    `.${scopeClass} .pdf-hero-lower{margin-top:16px;padding-top:16px;border-top:1px solid ${RULE};}`,
    `.${scopeClass} .pdf-hero-section-title{font-size:11px;font-weight:500;color:${TEXT_MUTED}!important;margin:12px 0 6px;}`,
  ].join('\n')
}
