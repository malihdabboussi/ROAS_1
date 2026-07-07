import {
  PRESENTATION_SLIDE_H_INCHES,
  PRESENTATION_SLIDE_W_INCHES,
} from './artifact-presentation-constants'

type PresentationPptSlideLike = {
  background?: { color: string }
  addImage: (options: { data: string; x: number; y: number; w: number; h: number }) => void
  addShape: (
    shape: 'rect',
    options: {
      x: number
      y: number
      w: number
      h: number
      fill: { color: string }
    },
  ) => void
  addText: (
    text: string,
    options: {
      x: number
      y: number
      w: number
      h: number
      fontSize: number
      color: string
      bold: boolean
      italic: boolean
      align: 'left' | 'center' | 'right' | 'justify'
      fontFace: string
      valign: 'top'
      margin: number
      wrap: boolean
    },
  ) => void
}

const SKIP_TAGS = new Set(['STYLE', 'SCRIPT', 'SVG', 'NOSCRIPT', 'LINK', 'META', 'BR', 'HEAD'])
const TEXT_LEAF_TAGS = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'SPAN',
  'A',
  'STRONG',
  'EM',
  'B',
  'I',
  'LI',
  'LABEL',
  'BLOCKQUOTE',
  'FIGCAPTION',
  'TD',
  'TH',
  'DT',
  'DD',
  'BUTTON',
])

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!match) return '000000'
  return [match[1], match[2], match[3]]
    .map((c) => parseInt(c!, 10).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

function isTransparentColor(color: string): boolean {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return true
  const match = color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/)
  return match ? parseFloat(match[1]!) === 0 : false
}

async function imgElToDataUrl(img: HTMLImageElement): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function hasTextLeafChild(el: HTMLElement): boolean {
  for (const child of el.children) {
    if (
      child instanceof HTMLElement &&
      TEXT_LEAF_TAGS.has(child.tagName) &&
      child.textContent?.trim()
    ) {
      return true
    }
  }
  return false
}

export async function domToPresentationPptSlide(
  section: HTMLElement,
  slideLike: unknown,
  sectionW: number,
  sectionH: number,
): Promise<void> {
  const slide = slideLike as PresentationPptSlideLike
  const sRect = section.getBoundingClientRect()
  const sL = sRect.left
  const sT = sRect.top
  const toX = (px: number) => ((px - sL) / sectionW) * PRESENTATION_SLIDE_W_INCHES
  const toY = (px: number) => ((px - sT) / sectionH) * PRESENTATION_SLIDE_H_INCHES
  const toW = (px: number) => (px / sectionW) * PRESENTATION_SLIDE_W_INCHES
  const toH = (px: number) => (px / sectionH) * PRESENTATION_SLIDE_H_INCHES
  const toPt = (px: number) => (px / sectionW) * PRESENTATION_SLIDE_W_INCHES * 72

  const win = section.ownerDocument.defaultView!
  const sectionBg = win.getComputedStyle(section).backgroundColor
  if (!isTransparentColor(sectionBg)) {
    slide.background = { color: rgbToHex(sectionBg) }
  }

  const processed = new WeakSet<HTMLElement>()

  async function walk(el: HTMLElement): Promise<void> {
    if (SKIP_TAGS.has(el.tagName) || processed.has(el)) return

    const cs = win.getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return

    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return

    if (el.tagName === 'IMG') {
      const dataUrl = await imgElToDataUrl(el as HTMLImageElement)
      if (dataUrl) {
        slide.addImage({
          data: dataUrl,
          x: toX(rect.left),
          y: toY(rect.top),
          w: toW(rect.width),
          h: toH(rect.height),
        })
      }
      return
    }

    if (el !== section && !isTransparentColor(cs.backgroundColor)) {
      slide.addShape('rect', {
        x: toX(rect.left),
        y: toY(rect.top),
        w: toW(rect.width),
        h: toH(rect.height),
        fill: { color: rgbToHex(cs.backgroundColor) },
      })
    }

    if (TEXT_LEAF_TAGS.has(el.tagName) && el.textContent?.trim() && !hasTextLeafChild(el)) {
      processed.add(el)
      const fontSize = Math.round(toPt(parseFloat(cs.fontSize)))
      let align: 'left' | 'center' | 'right' | 'justify' = 'left'
      if (cs.textAlign === 'center' || cs.textAlign === '-webkit-center') align = 'center'
      else if (cs.textAlign === 'right' || cs.textAlign === 'end') align = 'right'
      else if (cs.textAlign === 'justify') align = 'justify'

      slide.addText(el.textContent!.trim(), {
        x: toX(rect.left),
        y: toY(rect.top),
        w: Math.max(toW(rect.width), 0.5),
        h: Math.max(toH(rect.height), 0.3),
        fontSize: fontSize > 0 ? fontSize : 12,
        color: rgbToHex(cs.color),
        bold: parseInt(cs.fontWeight) >= 700 || cs.fontWeight === 'bold',
        italic: cs.fontStyle === 'italic',
        align,
        fontFace: cs.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim() || 'Arial',
        valign: 'top',
        margin: 0,
        wrap: true,
      })
      return
    }

    for (const child of el.children) {
      if (child instanceof HTMLElement) await walk(child)
    }
  }

  await walk(section)
}
