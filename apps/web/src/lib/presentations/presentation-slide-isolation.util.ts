import { parsePresentationSections, rebuildPresentationHtml } from './presentation-sections.util'

export function addSlideIndexAttributesToHtml(html: string): string {
  const parsed = parsePresentationSections(html)
  if (!parsed) return html
  const sections = parsed.sections.map((section, index) => {
    if (/data-vibey-slide-index\s*=/.test(section)) return section
    return section.replace(/<section\b/i, `<section data-vibey-slide-index="${index}"`)
  })
  return rebuildPresentationHtml({ ...parsed, sections })
}

export function buildPresentationSlideIsolationCss(slideIndex: number): string {
  const safeIndex = Math.max(0, slideIndex)
  return `<style data-vibey-slide-isolation>
html, body {
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  height: 100% !important;
  width: 100% !important;
}
section[data-vibey-slide-index] {
  display: none !important;
  visibility: hidden !important;
}
section[data-vibey-slide-index="${safeIndex}"] {
  display: flex !important;
  visibility: visible !important;
  min-height: 100% !important;
  width: 100% !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}
</style>`
}

export function injectPresentationSlideIsolation(html: string, slideIndex: number): string {
  const withIndexes = addSlideIndexAttributesToHtml(html)
  const isolationCss = buildPresentationSlideIsolationCss(slideIndex)
  if (withIndexes.includes('</head>')) {
    return withIndexes.replace('</head>', `${isolationCss}</head>`)
  }
  return `${isolationCss}${withIndexes}`
}
