/**
 * Shared markdown → PDF export (print-first, html2pdf fallback) and hosted-PDF download.
 * Same pipeline as DeliverablePreviewModal text deliverables + campaign theme.
 */

import { fetchCampaign } from '@/lib/campaigns'
import {
  generateGoogleFontsUrl,
  generateThemeCSS,
  getTheme,
  resolveThemeColors,
  type Theme,
} from '@/lib/themes'
import { sanitizeFilename } from './artifact-downloads'
import { stampMadeWithVibeyFooterOnAllPages } from './artifact-pdf-jspdf-footer'
import { getArtifactPdfPlatformUrl } from './artifact-pdf-shared'

const A4_PAGE_WIDTH_MM = 210
const A4_PAGE_HEIGHT_MM = 297
/** Bottom margin enlarged to prevent final-line/footer overlap in print and html2pdf paths. */
export const CAMPAIGN_MARKDOWN_PDF_MARGIN_MM: [number, number, number, number] = [12, 12, 24, 12]
const PDF_CONTENT_WIDTH_MM =
  A4_PAGE_WIDTH_MM - CAMPAIGN_MARKDOWN_PDF_MARGIN_MM[1] - CAMPAIGN_MARKDOWN_PDF_MARGIN_MM[3]
const PDF_CONTENT_MIN_HEIGHT_MM =
  A4_PAGE_HEIGHT_MM - CAMPAIGN_MARKDOWN_PDF_MARGIN_MM[0] - CAMPAIGN_MARKDOWN_PDF_MARGIN_MM[2]
const HTML2PDF_TRAILING_BUFFER_MM = 24

function extractHexColor(value: string | null | undefined, fallback: string): string {
  if (!value || typeof value !== 'string') return fallback
  const match = value.match(/#[0-9a-fA-F]{6}/)
  return match ? match[0] : fallback
}

function relativeLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '')
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
  const linearized = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * linearized[0]! + 0.7152 * linearized[1]! + 0.0722 * linearized[2]!
}

function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const fg = relativeLuminance(foregroundHex)
  const bg = relativeLuminance(backgroundHex)
  const lighter = Math.max(fg, bg)
  const darker = Math.min(fg, bg)
  return (lighter + 0.05) / (darker + 0.05)
}

function resolveExportPalette(theme: Theme | null): {
  background: string
  border: string
  heading: string
  body: string
  link: string
} {
  const background = extractHexColor(theme?.colors.pageBackground, '#ffffff')
  const border = extractHexColor(theme?.colors.border, '#d1d5db')
  let heading = extractHexColor(theme?.colors.heading, '#0f172a')
  let body = extractHexColor(theme?.colors.body, '#334155')
  let link = extractHexColor(theme?.colors.primary, '#2563eb')

  if (contrastRatio(heading, background) < 7) heading = '#0f172a'
  if (contrastRatio(body, background) < 4.5) body = '#334155'
  if (contrastRatio(link, background) < 4.5) link = '#1d4ed8'

  return { background, border, heading, body, link }
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function clearActiveSelection(): void {
  if (typeof window === 'undefined') return
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  selection.removeAllRanges()
}

/** Print dialog footer — mirrors jsPDF footer (Watermark / offer PDF). */
function madeWithVibeyPrintFooterFragment(): string {
  const href = escapeHtmlAttr(getArtifactPdfPlatformUrl())
  return `<div class="vibey-campaign-pdf-footer"><a href="${href}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;"><span style="color:#374151;font-family:Helvetica,Arial,sans-serif;font-size:9pt;">Made with </span><span style="color:#9333ea;font-family:Helvetica,Arial,sans-serif;font-size:9pt;font-weight:700;">ROAS</span></a></div>`
}

const VIBEY_PRINT_FOOTER_CSS = `
@media print {
  .vibey-campaign-pdf-footer {
    position: fixed;
    bottom: 5mm;
    left: 0;
    right: 0;
    text-align: center;
    z-index: 99999;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
@media screen {
  .vibey-campaign-pdf-footer { display: none; }
}
`

export async function resolveCampaignThemeForPdfExport(
  campaignId: string | null,
): Promise<Theme | null> {
  if (!campaignId) return null
  try {
    const campaign = await fetchCampaign(campaignId)
    const config = (campaign.config as Record<string, unknown> | null) ?? null
    const agentSettings =
      config && typeof config.agent_settings === 'object' && config.agent_settings !== null
        ? (config.agent_settings as Record<string, unknown>)
        : null
    const themeId =
      agentSettings && typeof agentSettings.theme_id === 'string'
        ? agentSettings.theme_id.trim()
        : ''
    if (!themeId) return null
    return await getTheme(themeId)
  } catch {
    return null
  }
}

export function createThemedMarkdownExportSurface(
  contentNode: HTMLElement,
  theme: Theme | null,
): {
  exportNode: HTMLElement
  waitForFonts: () => Promise<void>
  cleanup: () => void
} {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-100000px'
  host.style.top = '0'
  host.style.width = `${PDF_CONTENT_WIDTH_MM}mm`
  host.style.opacity = '0'
  host.style.pointerEvents = 'none'
  host.setAttribute('aria-hidden', 'true')

  const scopeClass = `campaign-md-pdf-export-${Date.now()}`
  const scopeNode = document.createElement('div')
  scopeNode.className = scopeClass
  const clonedContent = contentNode.cloneNode(true) as HTMLElement
  scopeNode.appendChild(clonedContent)

  const styleTag = document.createElement('style')
  const palette = resolveExportPalette(theme)
  const themeCss = theme
    ? generateThemeCSS(resolveThemeColors(theme.colors), `.${scopeClass}`, {
        fontHeading: theme.font_heading,
        fontBody: theme.font_body,
      })
    : ''
  styleTag.textContent = [
    themeCss,
    `.${scopeClass}{box-sizing:border-box;width:${PDF_CONTENT_WIDTH_MM}mm;min-height:${PDF_CONTENT_MIN_HEIGHT_MM}mm;padding:16mm 14mm ${16 + HTML2PDF_TRAILING_BUFFER_MM}mm;background:${palette.background}!important;color:${palette.heading}!important;font-family:var(--font-body,ui-sans-serif,system-ui,sans-serif)!important;}`,
    `.${scopeClass} *{box-sizing:border-box;}`,
    `.${scopeClass} h1,.${scopeClass} h2,.${scopeClass} h3,.${scopeClass} h4,.${scopeClass} h5,.${scopeClass} h6{color:${palette.heading}!important;font-family:var(--font-heading,var(--font-body,ui-sans-serif,system-ui,sans-serif))!important;break-inside:avoid;}`,
    `.${scopeClass} h1{font-size:22px;line-height:1.3;margin:0 0 16px;}`,
    `.${scopeClass} h2{font-size:18px;line-height:1.35;margin:18px 0 8px;}`,
    `.${scopeClass} h3{font-size:16px;line-height:1.35;margin:14px 0 8px;}`,
    `.${scopeClass} h4,.${scopeClass} h5,.${scopeClass} h6{line-height:1.35;margin:12px 0 6px;}`,
    `.${scopeClass} p{margin:8px 0;}`,
    `.${scopeClass} p,.${scopeClass} li,.${scopeClass} td,.${scopeClass} th,.${scopeClass} blockquote,.${scopeClass} code,.${scopeClass} span{color:${palette.body}!important;}`,
    `.${scopeClass} strong{color:${palette.heading}!important;}`,
    `.${scopeClass} a{color:${palette.link}!important;text-decoration:underline!important;}`,
    `.${scopeClass} p,.${scopeClass} li,.${scopeClass} ul,.${scopeClass} ol,.${scopeClass} blockquote{break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} hr{border:0;border-top:1px solid ${palette.border};margin:18px 0;break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} pre,.${scopeClass} code{white-space:pre-wrap!important;word-break:break-word;}`,
    `.${scopeClass} code{background:#f3f4f6!important;border-radius:4px;padding:0.05em 0.35em;color:${palette.heading}!important;}`,
    `.${scopeClass} pre{background:#f8fafc!important;border:1px solid ${palette.border};border-radius:8px;padding:8px 10px;}`,
    `.${scopeClass} pre code{background:transparent!important;padding:0;}`,
    `.${scopeClass} table{width:100%;border-collapse:collapse;table-layout:fixed;margin:12px 0;break-inside:auto;page-break-inside:auto;}`,
    `.${scopeClass} thead{display:table-header-group;}`,
    `.${scopeClass} tfoot{display:table-footer-group;}`,
    `.${scopeClass} tr{break-inside:avoid;page-break-inside:avoid;}`,
    `.${scopeClass} th,.${scopeClass} td{border:1px solid ${palette.border};padding:6px 8px;overflow-wrap:anywhere;word-break:break-word;}`,
    `.${scopeClass} img,.${scopeClass} video,.${scopeClass} iframe{max-width:100%;height:auto;}`,
    `.${scopeClass} > *:last-child{padding-bottom:6mm;}`,
  ].join('\n')

  const fontsUrl = theme
    ? generateGoogleFontsUrl({
        fontHeading: theme.font_heading,
        fontBody: theme.font_body,
      })
    : null
  if (fontsUrl) {
    const linkTag = document.createElement('link')
    linkTag.rel = 'stylesheet'
    linkTag.href = fontsUrl
    host.appendChild(linkTag)
  }

  host.appendChild(styleTag)
  host.appendChild(scopeNode)
  document.body.appendChild(host)

  return {
    exportNode: scopeNode,
    waitForFonts: async () => {
      if (!fontsUrl) return
      await new Promise((resolve) => window.setTimeout(resolve, 220))
    },
    cleanup: () => {
      if (host.parentNode) host.parentNode.removeChild(host)
    },
  }
}

/** Hosted PDF (e.g. deliverable or document file_url) — same as DeliverablePreviewModal. */
export function triggerRemotePdfDownload(
  url: string,
  fileName: string | null | undefined,
  titleForSlug: string | null | undefined,
): void {
  const slug = (titleForSlug ?? 'document').toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const name = fileName && fileName.trim().length > 0 ? fileName : `${slug}.pdf`
  const a = document.createElement('a')
  a.href = url
  a.download = name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.click()
}

export async function exportCampaignMarkdownDomToPdf(options: {
  contentElement: HTMLElement
  campaignId: string | null
  filenameBase: string
  /** Prefer OS print → Save as PDF (selectable text) for markdown-heavy content */
  preferPrintPipeline: boolean
}): Promise<void> {
  clearActiveSelection()
  const theme = await resolveCampaignThemeForPdfExport(options.campaignId)
  const surface = createThemedMarkdownExportSurface(options.contentElement, theme)
  let cleanupExportSurface: (() => void) | null = surface.cleanup
  try {
    await surface.waitForFonts()
    const slug = sanitizeFilename(options.filenameBase, 'document')

    if (options.preferPrintPipeline) {
      const printWindow = window.open('', '_blank', 'noopener,noreferrer')
      if (printWindow) {
        const printDoc = printWindow.document
        const sourceStyle =
          surface.exportNode.parentElement?.querySelector('style')?.textContent ?? ''
        const fontHref =
          surface.exportNode.parentElement
            ?.querySelector('link[rel="stylesheet"]')
            ?.getAttribute('href') ?? ''
        const printStyle = [
          sourceStyle,
          VIBEY_PRINT_FOOTER_CSS,
          `@page { size: A4; margin: ${CAMPAIGN_MARKDOWN_PDF_MARGIN_MM[0]}mm ${CAMPAIGN_MARKDOWN_PDF_MARGIN_MM[1]}mm ${CAMPAIGN_MARKDOWN_PDF_MARGIN_MM[2]}mm ${CAMPAIGN_MARKDOWN_PDF_MARGIN_MM[3]}mm; }`,
          'html, body { margin: 0; padding: 0; background: #ffffff; overflow: visible; }',
          'body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
          '.print-root { width: 100%; box-sizing: border-box; padding-bottom: 14mm; }',
          '.print-root, .print-root * { box-sizing: border-box; }',
          '.print-root > :first-child { width: auto !important; max-width: 100% !important; }',
          '.print-root > * { break-inside: auto; page-break-inside: auto; }',
          '.print-root h1,.print-root h2,.print-root h3,.print-root h4,.print-root h5,.print-root h6,.print-root pre,.print-root blockquote { break-inside: avoid; page-break-inside: avoid; }',
          '.print-root p,.print-root li,.print-root ul,.print-root ol,.print-root blockquote { break-inside: auto !important; page-break-inside: auto !important; }',
          '.print-root table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; break-inside: auto !important; page-break-inside: auto !important; }',
          '.print-root thead { display: table-header-group !important; }',
          '.print-root tfoot { display: table-footer-group !important; }',
          '.print-root tr { break-inside: avoid !important; page-break-inside: avoid !important; }',
          '.print-root th,.print-root td { overflow-wrap: anywhere !important; word-break: break-word !important; }',
          '.print-root [class*="overflow-x-auto"] { overflow: visible !important; }',
          '.print-root img,.print-root video,.print-root iframe,.print-root canvas,.print-root textarea,.print-root input,.print-root select { max-width: 100% !important; }',
          '.print-root textarea { width: 100% !important; white-space: pre-wrap !important; }',
          '.print-root *::selection { background: transparent !important; color: inherit !important; }',
        ].join('\n')

        printDoc.open()
        printDoc.write(
          [
            '<!doctype html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8" />',
            '<title>',
            `${slug}.pdf`,
            '</title>',
            fontHref ? `<link rel="stylesheet" href="${fontHref}" />` : '',
            `<style>${printStyle}</style>`,
            '</head>',
            '<body>',
            `<div class="print-root">${surface.exportNode.innerHTML}</div>`,
            madeWithVibeyPrintFooterFragment(),
            '</body>',
            '</html>',
          ].join(''),
        )
        printDoc.close()
        await new Promise((resolve) => window.setTimeout(resolve, 260))
        printWindow.focus()
        printWindow.print()
        window.setTimeout(() => {
          printWindow.close()
        }, 120)
        return
      }
    }

    const html2pdf = (await import('html2pdf.js')).default
    const exportWidth = Math.ceil(surface.exportNode.scrollWidth)
    const opt = {
      margin: CAMPAIGN_MARKDOWN_PDF_MARGIN_MM,
      filename: `${slug}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      enableLinks: true,
      html2canvas: {
        scale: Math.max(2, Math.floor(window.devicePixelRatio || 1)),
        width: exportWidth,
        windowWidth: exportWidth,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        // html2pdf injects page-break padding after source measurement; fixed
        // pre-pagebreak heights crop the final block after that padding lands.
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: {
        mode: ['css', 'legacy'] as const,
        avoid: [
          'tr',
          'thead',
          'tfoot',
          'pre',
          'blockquote',
          'p',
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
        ],
      },
    }
    const worker = (html2pdf() as any).set(opt).from(surface.exportNode)
    await worker.toPdf()
    const pdf = await worker.get('pdf')
    stampMadeWithVibeyFooterOnAllPages(pdf)
    await worker.save()
  } finally {
    if (cleanupExportSurface) {
      cleanupExportSurface()
      cleanupExportSurface = null
    }
  }
}
