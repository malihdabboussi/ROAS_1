import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import { sanitizeFilename } from '../utils/artifact-export'

/**
 * Carousel Export Utilities
 *
 * Functions for exporting carousel social posts as ZIP or PDF
 */

/**
 * Convert Blob to base64 data URL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Download carousel slides as individual PNGs in a ZIP file
 */
export async function downloadCarouselAsZIP(
  postTitle: string,
  renderSlide: (index: number) => Promise<Blob>,
  slideCount: number,
): Promise<string> {
  const zip = new JSZip()
  const folderName = sanitizeFilename(postTitle, 'carousel')

  for (let i = 0; i < slideCount; i++) {
    const blob = await renderSlide(i)
    zip.file(`slide-${i + 1}.png`, blob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const filename = `${folderName}.zip`

  // Trigger download
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return filename
}

/**
 * Download carousel slides as multi-page PDF
 */
export async function downloadCarouselAsPDF(
  postTitle: string,
  renderSlide: (index: number) => Promise<Blob>,
  slideCount: number,
  dimensions: { width: number; height: number },
): Promise<string> {
  const { width, height } = dimensions
  const orientation = width > height ? 'landscape' : 'portrait'

  // Create PDF with correct dimensions
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [width, height],
  })

  for (let i = 0; i < slideCount; i++) {
    const blob = await renderSlide(i)
    const dataUrl = await blobToDataURL(blob)

    if (i > 0) {
      pdf.addPage()
    }

    // Use SLOW compression for best quality (PNG preserves all detail)
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height, undefined, 'SLOW')
  }

  const filename = `${sanitizeFilename(postTitle, 'carousel')}.pdf`
  pdf.save(filename)

  return filename
}
