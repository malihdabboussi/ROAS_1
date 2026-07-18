import { toast } from 'sonner'
import { sanitizeFilename } from '@/lib/artifacts'
import { canvasToVisualPdf, canvasToVisualPdfBlob } from './space-doc-visual-pdf-canvas'
import {
  applyVisualDocPdfGradientTextFallback,
  applyVisualDocPdfPagination,
  applyVisualDocPdfViewport,
  getVisualDocExportSize,
  getVisualPdfContentPageHeightPx,
  VISUAL_PDF_INITIAL_HEIGHT,
  VISUAL_PDF_VIEWPORT_WIDTH,
  waitForVisualDocIframe,
} from './space-doc-visual-pdf-dom'

type VisualPdfOptions = {
  title: string
  visualHtml: string
}

export async function exportSpaceDocVisualPdf(options: VisualPdfOptions): Promise<void> {
  try {
    await renderVisualDocToCanvas(options, async (canvas) => {
      const filename = `${sanitizeFilename(`${options.title.trim() || 'Untitled'} visual`, 'visual-doc')}.pdf`
      await canvasToVisualPdf({ canvas, filename })
    })
  } catch {
    toast.error('Failed to export visual doc as PDF')
  }
}

export async function createSpaceDocVisualPdfBlob(options: VisualPdfOptions): Promise<Blob> {
  return renderVisualDocToCanvas(options, canvasToVisualPdfBlob)
}

async function renderVisualDocToCanvas<T>(
  options: VisualPdfOptions,
  write: (canvas: HTMLCanvasElement) => Promise<T>,
): Promise<T> {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = `position:fixed;left:-100000px;top:0;width:${VISUAL_PDF_VIEWPORT_WIDTH}px;height:${VISUAL_PDF_INITIAL_HEIGHT}px;opacity:0;pointer-events:none;border:0`
  iframe.setAttribute('aria-hidden', 'true')
  iframe.sandbox.add('allow-same-origin')
  document.body.appendChild(iframe)

  try {
    iframe.srcdoc = options.visualHtml
    const doc = await waitForVisualDocIframe(iframe)
    applyVisualDocPdfViewport(doc)
    applyVisualDocPdfGradientTextFallback(doc)
    let { width: exportWidth, height: exportHeight } = getVisualDocExportSize(doc)
    iframe.style.width = `${exportWidth}px`
    iframe.style.height = `${exportHeight}px`
    await new Promise((resolve) => window.setTimeout(resolve, 80))
    applyVisualDocPdfPagination(doc, getVisualPdfContentPageHeightPx(exportWidth))
    const paginatedSize = getVisualDocExportSize(doc)
    exportWidth = paginatedSize.width
    exportHeight = paginatedSize.height
    iframe.style.height = `${exportHeight}px`
    await new Promise((resolve) => window.setTimeout(resolve, 80))

    const html2canvas = (await import('html2canvas-pro')).default
    const canvas = await html2canvas(doc.documentElement, {
      scale: Math.max(2, Math.floor(window.devicePixelRatio || 1)),
      width: exportWidth,
      height: exportHeight,
      windowWidth: exportWidth,
      windowHeight: exportHeight,
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
    return await write(canvas)
  } finally {
    iframe.parentNode?.removeChild(iframe)
  }
}
