export interface PresentationTweakBlock {
  id: string
  start: number
  end: number
  rawJson: string
  value: Record<string, unknown>
}

const BEGIN = '/*EDITMODE-BEGIN*/'
const END = '/*EDITMODE-END*/'

export function parsePresentationTweakBlocks(source: string): PresentationTweakBlock[] {
  const blocks: PresentationTweakBlock[] = []
  let cursor = 0

  while (cursor < source.length) {
    const start = source.indexOf(BEGIN, cursor)
    if (start === -1) break
    const jsonStart = start + BEGIN.length
    const endMarker = source.indexOf(END, jsonStart)
    if (endMarker === -1) break
    const rawJson = source.slice(jsonStart, endMarker).trim()
    const parsed = JSON.parse(rawJson) as Record<string, unknown>
    const id =
      typeof parsed.id === 'string' && parsed.id.trim().length > 0
        ? parsed.id.trim()
        : `tweak-${blocks.length + 1}`
    blocks.push({
      id,
      start,
      end: endMarker + END.length,
      rawJson,
      value: parsed,
    })
    cursor = endMarker + END.length
  }

  return blocks
}

export function writePresentationTweakBlock(
  source: string,
  block: PresentationTweakBlock,
  nextValue: Record<string, unknown>,
): string {
  const nextJson = JSON.stringify(nextValue, null, 2)
  return `${source.slice(0, block.start)}${BEGIN}\n${nextJson}\n${END}${source.slice(block.end)}`
}
