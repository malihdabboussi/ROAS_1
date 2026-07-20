import sharp from 'sharp'

export type ValidateMessagingLine = {
  text: string
  highlight: string
  stamp?: string
}

type RenderVariant = 'light' | 'dark' | 'bold'

type RenderWord = {
  text: string
  highlighted: boolean
}

const WIDTH = 1080
const HEIGHT = 1350
const MAX_LINE_WIDTH = 850
const HEX_COLOR = /^#[0-9a-f]{6}$/i

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function safeColor(value: string | undefined, fallback: string): string {
  return value && HEX_COLOR.test(value) ? value : fallback
}

function markHighlight(text: string, highlight: string): RenderWord[] {
  const words = text.trim().split(/\s+/)
  const normalizedWords = words.map(normalize)
  const highlightWords = highlight.trim().split(/\s+/).map(normalize)
  const start = normalizedWords.findIndex((_, index) =>
    highlightWords.every((word, offset) => normalizedWords[index + offset] === word),
  )
  return words.map((word, index) => ({
    text: word,
    highlighted: start >= 0 && index >= start && index < start + highlightWords.length,
  }))
}

function wrapWords(words: RenderWord[], fontSize: number): RenderWord[][] {
  const lines: RenderWord[][] = []
  let current: RenderWord[] = []
  let width = 0
  for (const word of words) {
    const wordWidth = word.text.length * fontSize * 0.59
    const nextWidth = current.length === 0 ? wordWidth : width + fontSize * 0.32 + wordWidth
    if (current.length > 0 && nextWidth > MAX_LINE_WIDTH) {
      lines.push(current)
      current = [word]
      width = wordWidth
    } else {
      current.push(word)
      width = nextWidth
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

function renderLine(
  words: RenderWord[],
  y: number,
  fontSize: number,
  variant: RenderVariant,
  accent: string,
): string {
  const widths = words.map((word) => word.text.length * fontSize * 0.59)
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) + Math.max(0, words.length - 1) * fontSize * 0.32
  let x = (WIDTH - totalWidth) / 2
  const elements: string[] = []
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!
    const wordWidth = widths[index]!
    const highlighted = word.highlighted
    if (highlighted && variant !== 'bold') {
      elements.push(
        `<rect x="${x - 7}" y="${y - fontSize * 0.82}" width="${wordWidth + 14}" height="${fontSize * 1.02}" rx="5" fill="${accent}"/>`,
      )
    }
    elements.push(
      `<text x="${x}" y="${y}" font-family="Poppins, Arial, sans-serif" font-size="${fontSize}" font-weight="${highlighted ? 800 : 650}" fill="${variant === 'light' ? '#161616' : '#F7F4EE'}">${escapeXml(word.text)}</text>`,
    )
    x += wordWidth + fontSize * 0.32
  }
  return elements.join('')
}

function buildSvg(
  line: ValidateMessagingLine,
  variant: RenderVariant,
  accent: string,
  backgroundLight: string,
  backgroundDark: string,
): string {
  const fontSize = line.text.length > 105 ? 60 : line.text.length > 75 ? 68 : 76
  const lines = wrapWords(markHighlight(line.text, line.highlight), fontSize)
  const lineHeight = fontSize * 1.22
  const blockHeight = lines.length * lineHeight
  const startY = (HEIGHT - blockHeight) / 2 + fontSize
  const background = variant === 'light' ? backgroundLight : backgroundDark
  const copy = lines
    .map((words, index) =>
      renderLine(words, startY + index * lineHeight, fontSize, variant, accent),
    )
    .join('')
  const stamp = line.stamp?.trim()
    ? `<text x="90" y="1230" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="800" fill="${variant === 'light' ? '#161616' : '#F7F4EE'}">${escapeXml(line.stamp.trim().toUpperCase())}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs><filter id="paper"><feTurbulence baseFrequency="0.8" numOctaves="3" seed="17"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .035 0"/></filter></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>
    <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#paper)" opacity="0.55"/>
    ${copy}${stamp}
  </svg>`
}

export class ArtifactValidateMessagingRendererService {
  async renderSet(input: {
    lines: ValidateMessagingLine[]
    accent: string
    backgroundLight?: string
    backgroundDark?: string
  }): Promise<Array<{ name: string; sourcePrompt: string; buffer: Buffer }>> {
    const rendered: Array<{ name: string; sourcePrompt: string; buffer: Buffer }> = []
    for (let lineIndex = 0; lineIndex < input.lines.length; lineIndex += 1) {
      const line = input.lines[lineIndex]!
      for (const variant of ['light', 'dark', 'bold'] as const) {
        const svg = buildSvg(
          line,
          variant,
          safeColor(input.accent, '#FFE04D'),
          safeColor(input.backgroundLight, '#F6F1E8'),
          safeColor(input.backgroundDark, '#1B1B1B'),
        )
        rendered.push({
          name: `Static ${lineIndex + 1} — ${variant[0]!.toUpperCase()}${variant.slice(1)}`,
          sourcePrompt: line.text,
          buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
        })
      }
    }
    return rendered
  }
}
