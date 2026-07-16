import { sanitizeFilename } from './artifact-downloads'
import {
  PRESENTATION_DECK_EXPORT_HEIGHT,
  PRESENTATION_DECK_EXPORT_WIDTH,
} from './artifact-presentation-constants'
import { getPresentationExportIframe } from './artifact-presentation-iframe-export'
import { domToPresentationPptSlide } from './artifact-presentation-ppt-dom'
import {
  buildPresentationSlideDom,
  detectPresentationSlideElements,
} from './artifact-presentation-slide-dom'

type PptSlideWithNotes = {
  addNotes?: (notes: string) => void
}

function extractSpeakerNotes(doc: Document): string[] {
  const node = doc.querySelector<HTMLScriptElement>('script#speaker-notes[type="application/json"]')
  if (!node?.textContent?.trim()) return []
  const parsed = JSON.parse(node.textContent) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed.map((item) => String(item ?? '').trim())
}

async function exportPresentationFromLiveIframe(title: string): Promise<string> {
  const sourceIframe = getPresentationExportIframe()
  if (!sourceIframe?.contentDocument?.body) {
    throw new Error('Presentation preview not available for export')
  }

  const iframeDoc = sourceIframe.contentDocument
  let sections = [...iframeDoc.querySelectorAll<HTMLElement>('section')]
  if (sections.length === 0) {
    sections = detectPresentationSlideElements(iframeDoc, PRESENTATION_DECK_EXPORT_HEIGHT)
  }
  if (sections.length === 0) {
    throw new Error('No slides found in presentation')
  }

  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'ROAS'
  pptx.subject = 'Presentation export'
  pptx.title = title || 'Presentation'

  const filename = `${sanitizeFilename(title, 'presentation')}.pptx`
  const originalStyles = sections.map((s) => s.getAttribute('style') || '')
  const speakerNotes = extractSpeakerNotes(iframeDoc)
  const revealCss =
    'position:fixed!important;top:0!important;left:0!important;' +
    `width:${PRESENTATION_DECK_EXPORT_WIDTH}px!important;height:${PRESENTATION_DECK_EXPORT_HEIGHT}px!important;` +
    'display:flex!important;box-sizing:border-box!important;visibility:visible!important;opacity:1!important;' +
    'transform:none!important;z-index:99999!important;overflow:hidden!important;'

  try {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]!
      section.style.cssText = revealCss
      await new Promise((r) => setTimeout(r, 30))

      const pptSlide = pptx.addSlide()
      await domToPresentationPptSlide(
        section,
        pptSlide,
        PRESENTATION_DECK_EXPORT_WIDTH,
        PRESENTATION_DECK_EXPORT_HEIGHT,
      )
      const note = speakerNotes[i]
      const slideWithNotes = pptSlide as PptSlideWithNotes
      if (note && typeof slideWithNotes.addNotes === 'function') {
        slideWithNotes.addNotes(note)
      }

      const orig = originalStyles[i]!
      if (orig) section.setAttribute('style', orig)
      else section.removeAttribute('style')
    }

    await pptx.writeFile({ fileName: filename })
  } finally {
    sections.forEach((s, i) => {
      const orig = originalStyles[i]!
      if (orig) s.setAttribute('style', orig)
      else s.removeAttribute('style')
    })
  }

  return filename
}

export async function downloadPresentationPPTFromIframe(title: string): Promise<string> {
  return exportPresentationFromLiveIframe(title)
}

export function downloadPresentationPPTFromSlides(
  slides: Record<string, unknown>[],
  title: string,
): Promise<string> {
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error('No slides to export')
  }

  return (async () => {
    const { host, nodes } = buildPresentationSlideDom(slides, title)
    const filename = `${sanitizeFilename(title, 'presentation')}.pptx`
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const PptxGenJS = (await import('pptxgenjs')).default
      const pptx = new PptxGenJS()
      pptx.layout = 'LAYOUT_WIDE'
      pptx.author = 'ROAS'
      pptx.subject = 'Presentation export'
      pptx.title = title || 'Presentation'

      for (const node of nodes) {
        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        })
        const imageData = canvas.toDataURL('image/png')
        const slide = pptx.addSlide()
        slide.addImage({ data: imageData, x: 0, y: 0, w: 13.333, h: 7.5 })
      }

      await pptx.writeFile({ fileName: filename })
      return filename
    } finally {
      if (host.parentNode) host.parentNode.removeChild(host)
    }
  })()
}
