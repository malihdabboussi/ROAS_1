import type { PastedTextBlock } from './pasted-text.types'

export function mergeComposerContent(pastedBlocks: PastedTextBlock[], promptText: string): string {
  const parts = [...pastedBlocks.map((b) => b.text.trim()).filter(Boolean), promptText.trim()]
  return parts.join('\n\n')
}

export function pastedBlocksToHtml(blocks: PastedTextBlock[]): string {
  if (blocks.length === 0) return ''
  return blocks
    .map((b) => {
      const escaped = b.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<pre>${escaped}</pre>`
    })
    .join('')
}
