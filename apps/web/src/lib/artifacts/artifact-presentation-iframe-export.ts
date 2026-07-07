import { sanitizeFilename } from './artifact-downloads'
import {
  PRESENTATION_DECK_EXPORT_HEIGHT,
  PRESENTATION_DECK_EXPORT_WIDTH,
} from './artifact-presentation-constants'
import { detectPresentationSlideElements } from './artifact-presentation-slide-dom'

export function getPresentationExportIframe(): HTMLIFrameElement | null {
  return document.querySelector<HTMLIFrameElement>('[data-presentation-export-iframe]')
}

async function captureSlidesFromIframe(
  sourceIframe: HTMLIFrameElement,
  format: 'jpeg' | 'png',
  quality = 0.95,
): Promise<{ images: string[]; cleanup: () => void }> {
  const outerHTML = sourceIframe.contentDocument?.documentElement?.outerHTML ?? ''
  const srcdoc = outerHTML || sourceIframe.getAttribute('srcdoc') || ''
  if (!srcdoc) throw new Error('Presentation preview has no content to export')

  const offscreen = document.createElement('iframe')
  offscreen.style.cssText = `position:fixed;left:-20000px;top:0;width:${PRESENTATION_DECK_EXPORT_WIDTH}px;height:${PRESENTATION_DECK_EXPORT_HEIGHT}px;border:0;opacity:0;pointer-events:none;`
  offscreen.setAttribute('aria-hidden', 'true')
  offscreen.sandbox.add('allow-scripts', 'allow-same-origin')
  document.body.appendChild(offscreen)
  offscreen.srcdoc = srcdoc

  await new Promise<void>((resolve) => {
    offscreen.addEventListener('load', () => resolve(), { once: true })
  })

  const doc = offscreen.contentDocument
  if (!doc?.body) {
    offscreen.remove()
    throw new Error('Offscreen iframe failed to render')
  }

  const imgs = [...doc.querySelectorAll<HTMLImageElement>('img')]
  if (imgs.length > 0) {
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener('load', () => res(), { once: true })
              img.addEventListener('error', () => res(), { once: true })
            }),
      ),
    )
  }
  await new Promise((r) => setTimeout(r, 300))

  const cleanup = () => offscreen.remove()
  const html2canvas = (await import('html2canvas-pro')).default
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'

  const slides = detectPresentationSlideElements(doc, PRESENTATION_DECK_EXPORT_HEIGHT)

  if (slides.length >= 2) {
    let ancestor = slides[0]!.parentElement
    while (ancestor && ancestor !== doc.body) {
      const st = ancestor.style
      st.setProperty('overflow', 'visible', 'important')
      st.setProperty('height', 'auto', 'important')
      st.setProperty('max-height', 'none', 'important')
      st.setProperty('transform', 'none', 'important')
      st.setProperty('display', 'block', 'important')
      ancestor = ancestor.parentElement
    }

    const images: string[] = []
    for (let i = 0; i < slides.length; i++) {
      for (const s of slides) s.style.setProperty('display', 'none', 'important')
      const target = slides[i]!
      target.style.setProperty('display', 'flex', 'important')
      target.style.setProperty('box-sizing', 'border-box', 'important')
      target.style.setProperty('position', 'relative', 'important')
      target.style.setProperty('opacity', '1', 'important')
      target.style.setProperty('visibility', 'visible', 'important')
      target.style.setProperty('transform', 'none', 'important')
      target.style.setProperty('width', `${PRESENTATION_DECK_EXPORT_WIDTH}px`, 'important')
      target.style.setProperty('height', `${PRESENTATION_DECK_EXPORT_HEIGHT}px`, 'important')
      target.style.setProperty('min-height', `${PRESENTATION_DECK_EXPORT_HEIGHT}px`, 'important')
      target.style.setProperty('overflow', 'hidden', 'important')

      await new Promise((r) => setTimeout(r, 50))

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: PRESENTATION_DECK_EXPORT_WIDTH,
        height: PRESENTATION_DECK_EXPORT_HEIGHT,
      })
      images.push(canvas.toDataURL(mimeType, quality))
    }
    return { images, cleanup }
  }

  const totalHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
  if (totalHeight > PRESENTATION_DECK_EXPORT_HEIGHT * 1.2) {
    offscreen.style.height = `${totalHeight}px`
    await new Promise((r) => setTimeout(r, 100))

    const canvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: PRESENTATION_DECK_EXPORT_WIDTH,
      height: totalHeight,
    })

    const scaledPageH = PRESENTATION_DECK_EXPORT_HEIGHT * 2
    const scaledPageW = PRESENTATION_DECK_EXPORT_WIDTH * 2
    const pageCount = Math.max(1, Math.ceil(canvas.height / scaledPageH))
    const images: string[] = []

    for (let p = 0; p < pageCount; p++) {
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = scaledPageW
      pageCanvas.height = scaledPageH
      const ctx = pageCanvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, scaledPageW, scaledPageH)
      const srcY = p * scaledPageH
      const srcH = Math.min(scaledPageH, canvas.height - srcY)
      ctx.drawImage(canvas, 0, srcY, scaledPageW, srcH, 0, 0, scaledPageW, srcH)
      images.push(pageCanvas.toDataURL(mimeType, quality))
    }
    return { images, cleanup }
  }

  const canvas = await html2canvas(doc.body, {
    scale: 2,
    useCORS: true,
    logging: false,
    width: PRESENTATION_DECK_EXPORT_WIDTH,
    height: PRESENTATION_DECK_EXPORT_HEIGHT,
  })
  return { images: [canvas.toDataURL(mimeType, quality)], cleanup }
}

export async function downloadPresentationPDFFromIframe(title: string): Promise<string> {
  const sourceIframe = getPresentationExportIframe()
  if (!sourceIframe?.contentDocument?.body) {
    throw new Error('Presentation preview not available for export')
  }

  const { images, cleanup } = await captureSlidesFromIframe(sourceIframe, 'jpeg', 0.95)
  const filename = `${sanitizeFilename(title, 'presentation')}.pdf`

  try {
    const { jsPDF } = await import('jspdf')
    const pageW = 338.667
    const pageH = pageW * (PRESENTATION_DECK_EXPORT_HEIGHT / PRESENTATION_DECK_EXPORT_WIDTH)
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageW, pageH] })

    for (let i = 0; i < images.length; i++) {
      if (i > 0) pdf.addPage()
      pdf.addImage(images[i]!, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST')
    }

    pdf.save(filename)
  } finally {
    cleanup()
  }
  return filename
}
