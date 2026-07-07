import { sanitizeFilename } from './artifact-downloads'
import {
  PRESENTATION_EXPORT_HEIGHT,
  PRESENTATION_EXPORT_WIDTH,
} from './artifact-presentation-constants'
import { buildPresentationSlideDom } from './artifact-presentation-slide-dom'

export async function downloadPresentationPDFFromSlides(
  slides: Record<string, unknown>[],
  title: string,
): Promise<string> {
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error('No slides to export')
  }

  const { host, nodes } = buildPresentationSlideDom(slides, title)
  const filename = `${sanitizeFilename(title, 'presentation')}.pdf`

  try {
    const html2canvas = (await import('html2canvas-pro')).default
    const { jsPDF } = await import('jspdf')
    const pageW = 338.667
    const pageH = pageW * (PRESENTATION_EXPORT_HEIGHT / PRESENTATION_EXPORT_WIDTH)
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageW, pageH] })

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (!node) continue
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imageData = canvas.toDataURL('image/jpeg', 0.95)

      if (i > 0) pdf.addPage()
      pdf.addImage(imageData, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST')
    }

    pdf.save(filename)
  } finally {
    if (host.parentNode) host.parentNode.removeChild(host)
  }

  return filename
}
