import type { jsPDF } from 'jspdf'
import { VISUAL_PDF_FOOTER_SPACE_MM } from './space-doc-visual-pdf-dom'

function isMostlyBlankCanvasRow(ctx: CanvasRenderingContext2D, width: number, y: number): boolean {
  const sampleStep = 16
  const data = ctx.getImageData(0, y, width, 1).data
  let sampled = 0
  let marked = 0

  for (let x = 0; x < width; x += sampleStep) {
    const i = x * 4
    const alpha = data[i + 3] ?? 0
    if (alpha < 16) continue
    sampled += 1
    const r = data[i] ?? 255
    const g = data[i + 1] ?? 255
    const b = data[i + 2] ?? 255
    if (r < 236 || g < 236 || b < 236) marked += 1
  }

  return sampled === 0 || marked / sampled < 0.035
}

function findVisualPdfPageBreakY(
  canvas: HTMLCanvasElement,
  sourceY: number,
  targetY: number,
): number {
  if (targetY >= canvas.height) return canvas.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return targetY

  const minY = Math.max(sourceY + Math.floor((targetY - sourceY) * 0.62), sourceY + 1)
  const requiredBlankRows = 18
  let blankRows = 0

  for (let y = targetY; y >= minY; y -= 2) {
    if (isMostlyBlankCanvasRow(ctx, canvas.width, y)) {
      blankRows += 1
      if (blankRows >= requiredBlankRows) return Math.min(targetY, y + requiredBlankRows)
    } else {
      blankRows = 0
    }
  }

  return targetY
}

function sampleVisualPdfBackgroundColor(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
): [number, number, number] {
  const clampedY = Math.max(0, Math.min(y, ctx.canvas.height - 1))
  const points = [0.08, 0.5, 0.92].map((ratio) => Math.floor(width * ratio))
  const colors = points.map((x) => {
    const data = ctx.getImageData(Math.max(0, Math.min(x, width - 1)), clampedY, 1, 1).data
    return [data[0] ?? 255, data[1] ?? 255, data[2] ?? 255] as [number, number, number]
  })
  const darkColors = colors.filter(([r, g, b]) => r + g + b < 540)
  return darkColors[0] ?? colors[1] ?? [255, 255, 255]
}

function visualPdfColorCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`
}

function visualPdfIsDark([r, g, b]: [number, number, number]): boolean {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128
}

function stampVisualPdfFooterOnPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  contentHeightMm: number,
  backgroundColor: [number, number, number],
): void {
  const isDark = visualPdfIsDark(backgroundColor)
  const part1 = 'Made with '
  const part2 = 'ROAS'
  const textMuted: [number, number, number] = isDark ? [226, 232, 240] : [55, 65, 81]
  const vibeyPurple: [number, number, number] = isDark ? [196, 181, 253] : [147, 51, 234]
  const footerY = pageHeight - 7

  pdf.setFillColor(...backgroundColor)
  pdf.rect(0, contentHeightMm, pageWidth, pageHeight - contentHeightMm, 'F')
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...textMuted)
  const w1 = pdf.getTextWidth(part1)
  pdf.setFont('helvetica', 'bold')
  const w2 = pdf.getTextWidth(part2)
  let x = (pageWidth - w1 - w2) / 2
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...textMuted)
  pdf.text(part1, x, footerY)
  x += w1
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...vibeyPurple)
  pdf.text(part2, x, footerY)
}

export async function canvasToVisualPdf(options: {
  canvas: HTMLCanvasElement
  filename: string
}): Promise<void> {
  const pdf = await buildVisualPdf(options.canvas)
  pdf.save(options.filename)
}

export async function canvasToVisualPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const pdf = await buildVisualPdf(canvas)
  return pdf.output('blob')
}

async function buildVisualPdf(canvas: HTMLCanvasElement): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentHeightMm = pageHeight - VISUAL_PDF_FOOTER_SPACE_MM
  const pxPerMm = canvas.width / pageWidth
  const pageSliceHeightPx = Math.max(1, Math.floor(contentHeightMm * pxPerMm))
  const pageCanvas = document.createElement('canvas')
  pageCanvas.width = canvas.width
  const ctx = pageCanvas.getContext('2d')
  const sourceCtx = canvas.getContext('2d')
  if (!ctx) throw new Error('Visual PDF canvas unavailable')
  if (!sourceCtx) throw new Error('Visual PDF source canvas unavailable')

  let sourceY = 0
  let pageIndex = 0
  while (sourceY < canvas.height) {
    const targetY = Math.min(sourceY + pageSliceHeightPx, canvas.height)
    const breakY = findVisualPdfPageBreakY(canvas, sourceY, targetY)
    const sliceHeight = Math.max(1, breakY - sourceY)
    const backgroundColor = sampleVisualPdfBackgroundColor(
      sourceCtx,
      canvas.width,
      Math.max(sourceY, breakY - 2),
    )
    pageCanvas.height = pageSliceHeightPx
    ctx.fillStyle = visualPdfColorCss(backgroundColor)
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeight,
      0,
      0,
      pageCanvas.width,
      sliceHeight,
    )

    if (pageIndex > 0) pdf.addPage()
    pdf.addImage(
      pageCanvas.toDataURL('image/jpeg', 0.96),
      'JPEG',
      0,
      0,
      pageWidth,
      contentHeightMm,
      undefined,
      'FAST',
    )
    stampVisualPdfFooterOnPage(pdf, pageWidth, pageHeight, contentHeightMm, backgroundColor)
    sourceY = breakY
    pageIndex += 1
  }

  return pdf
}
