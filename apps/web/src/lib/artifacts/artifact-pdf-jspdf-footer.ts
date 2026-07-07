import type { jsPDF } from 'jspdf'
import { getArtifactPdfPlatformUrl } from './artifact-pdf-shared'

/** Typography aligned with apps/funnels/src/components/Watermark.tsx (12px, gray + bold brand). */
const FONT_PT = 9
const TEXT_MUTED_RGB: [number, number, number] = [55, 65, 81]
const VIBEY_PURPLE_RGB: [number, number, number] = [147, 51, 234]

/**
 * Draw "Made with Vibey" centered at the bottom of every page (jsPDF — html2canvas omits per-page HTML footers).
 */
export function stampMadeWithVibeyFooterOnAllPages(pdf: jsPDF): void {
  const url = getArtifactPdfPlatformUrl()
  const n = pdf.getNumberOfPages()
  const part1 = 'Made with '
  const part2 = 'Vibey'

  for (let i = 1; i <= n; i++) {
    pdf.setPage(i)
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const yFromBottomMm = 7

    pdf.setFontSize(FONT_PT)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...TEXT_MUTED_RGB)
    const w1 = pdf.getTextWidth(part1)
    pdf.setFont('helvetica', 'bold')
    const w2 = pdf.getTextWidth(part2)
    const totalW = w1 + w2
    let x = (pageW - totalW) / 2
    const y = pageH - yFromBottomMm

    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...TEXT_MUTED_RGB)
    pdf.text(part1, x, y)
    x += w1
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...VIBEY_PURPLE_RGB)
    pdf.text(part2, x, y)

    const linkH = 4.5
    const linkY = y - 3.2
    const linkX = (pageW - totalW) / 2
    pdf.link(linkX, linkY, totalW, linkH, { url })
  }
}
