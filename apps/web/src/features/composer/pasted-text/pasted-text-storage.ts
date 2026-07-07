import type { PastedTextBlock } from './pasted-text.types'

function storageKey(draftKey: string): string {
  return `${draftKey}:pasted`
}

export function loadPastedBlocksFromStorage(draftKey: string): PastedTextBlock[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(storageKey(draftKey))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as PastedTextBlock[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (b): b is PastedTextBlock =>
        typeof b === 'object' &&
        b !== null &&
        typeof b.id === 'string' &&
        typeof b.text === 'string',
    )
  } catch {
    localStorage.removeItem(storageKey(draftKey))
    return []
  }
}

export function savePastedBlocksToStorage(draftKey: string, blocks: PastedTextBlock[]): void {
  if (typeof window === 'undefined') return
  const key = storageKey(draftKey)
  if (blocks.length === 0) {
    localStorage.removeItem(key)
    return
  }
  localStorage.setItem(key, JSON.stringify(blocks))
}

export function clearPastedBlocksStorage(draftKey: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(storageKey(draftKey))
}
