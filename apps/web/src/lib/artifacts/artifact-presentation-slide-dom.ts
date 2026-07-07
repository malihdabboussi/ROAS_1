import {
  PRESENTATION_EXPORT_HEIGHT,
  PRESENTATION_EXPORT_WIDTH,
} from './artifact-presentation-constants'
import { normalizeEmDashToHyphen } from './artifact-text-normalization'

function normalizePresentationSlideString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return normalizeEmDashToHyphen(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getPresentationSlideLines(slide: Record<string, unknown>): string[] {
  const lines: string[] = []
  const seen = new Set<string>()
  const pushLine = (value: unknown) => {
    const normalized = normalizePresentationSlideString(value)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    lines.push(normalized)
  }

  for (const key of [
    'subtitle',
    'body',
    'content',
    'tagline',
    'author',
    'chapter',
    'cta_text',
    'cta_url',
  ]) {
    pushLine(slide[key])
  }

  const bullets = slide.bullets
  if (Array.isArray(bullets)) {
    for (const bullet of bullets) pushLine(bullet)
  }

  const stats = slide.stats
  if (Array.isArray(stats)) {
    for (const stat of stats) {
      if (!stat || typeof stat !== 'object') continue
      const statObj = stat as Record<string, unknown>
      const label = normalizePresentationSlideString(statObj.label)
      const value = normalizePresentationSlideString(statObj.value)
      if (label && value) pushLine(`${label}: ${value}`)
    }
  }

  const collectFallbackText = (value: unknown, depth = 0) => {
    if (depth > 3 || value == null) return
    if (typeof value === 'string') {
      pushLine(value)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) collectFallbackText(item, depth + 1)
      return
    }
    if (typeof value === 'object') {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        if (['id', 'type', 'image', 'image_url', 'background', 'layout', 'style'].includes(key))
          continue
        collectFallbackText(nested, depth + 1)
      }
    }
  }
  collectFallbackText(slide)

  return lines
}

export function buildPresentationSlideDom(
  slides: Record<string, unknown>[],
  title: string,
): { host: HTMLDivElement; nodes: HTMLDivElement[] } {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-100000px'
  host.style.top = '0'
  host.style.width = `${PRESENTATION_EXPORT_WIDTH}px`
  host.style.opacity = '0'
  host.style.pointerEvents = 'none'
  host.setAttribute('aria-hidden', 'true')

  const style = document.createElement('style')
  style.textContent = `
    .presentation-export-root {
      width: ${PRESENTATION_EXPORT_WIDTH}px;
      box-sizing: border-box;
      background: #ffffff;
      font-family: Inter, Arial, sans-serif;
      color: #0f172a;
    }
    .presentation-export-slide {
      width: ${PRESENTATION_EXPORT_WIDTH}px;
      height: ${PRESENTATION_EXPORT_HEIGHT}px;
      max-height: ${PRESENTATION_EXPORT_HEIGHT}px;
      overflow: hidden;
      box-sizing: border-box;
      background: #ffffff;
      padding: 44px 56px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    .presentation-export-label {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .presentation-export-slide h2 {
      margin: 0 0 14px;
      font-size: 46px;
      line-height: 1.12;
      color: #0f172a;
      font-weight: 700;
    }
    .presentation-export-slide p,
    .presentation-export-slide li {
      font-size: 28px;
      line-height: 1.42;
      color: #334155;
    }
    .presentation-export-slide ul {
      margin: 0;
      padding-left: 34px;
      display: grid;
      gap: 8px;
    }
  `
  host.appendChild(style)

  const root = document.createElement('div')
  root.className = 'presentation-export-root'
  root.setAttribute('data-presentation-export-title', escapeHtml(title))
  host.appendChild(root)

  const nodes: HTMLDivElement[] = []
  slides.forEach((rawSlide, idx) => {
    const slide = (rawSlide ?? {}) as Record<string, unknown>
    const slideTitle = normalizePresentationSlideString(slide.title) || `Slide ${idx + 1}`
    const lines = getPresentationSlideLines(slide)

    const section = document.createElement('div')
    section.className = 'presentation-export-slide'

    const label = document.createElement('div')
    label.className = 'presentation-export-label'
    label.textContent = `${title || 'Presentation'} - Slide ${idx + 1}`
    section.appendChild(label)

    const h2 = document.createElement('h2')
    h2.textContent = slideTitle
    section.appendChild(h2)

    if (lines.length > 0) {
      const ul = document.createElement('ul')
      lines.forEach((line) => {
        const li = document.createElement('li')
        li.textContent = line
        ul.appendChild(li)
      })
      section.appendChild(ul)
    } else {
      const p = document.createElement('p')
      p.textContent = 'No details provided.'
      section.appendChild(p)
    }

    root.appendChild(section)
    nodes.push(section)
  })

  document.body.appendChild(host)
  return { host, nodes }
}

export function detectPresentationSlideElements(doc: Document, exportHeight: number): HTMLElement[] {
  const sections = [...doc.body.querySelectorAll<HTMLElement>('section')]
  if (sections.length >= 2) return sections

  const root = doc.getElementById('vibey-preview-root') ?? doc.body
  let container: HTMLElement = root

  for (let depth = 0; depth < 10; depth++) {
    const children = [...container.children].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT',
    )
    if (children.length === 0) break

    if (children.length >= 2) {
      const byHeight = children.filter(
        (el) => el.offsetHeight >= exportHeight * 0.3 || el.scrollHeight >= exportHeight * 0.3,
      )
      if (byHeight.length >= 2) return byHeight

      const tagGroups = new Map<string, HTMLElement[]>()
      for (const child of children) {
        const tag = child.tagName
        if (!tagGroups.has(tag)) tagGroups.set(tag, [])
        tagGroups.get(tag)!.push(child)
      }
      for (const [, group] of tagGroups) {
        if (group.length >= 3) return group
      }
    }

    if (children.length === 1 && children[0]) {
      container = children[0]
      continue
    }

    const tallest = children.reduce(
      (a, b) => (b.offsetHeight > a.offsetHeight ? b : a),
      children[0]!,
    )
    if (tallest && tallest.children.length > 0) {
      container = tallest
      continue
    }

    break
  }

  return sections.length === 1 ? sections : []
}
