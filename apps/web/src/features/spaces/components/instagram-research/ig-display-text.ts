/** Normalize line endings and trim (for caption / hook / transcript display). */
export function normalizeMultilineDisplayText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
}

/** Max sentences per paragraph for transcript layout (target band 3–4). */
const TRANSCRIPT_MAX_SENTENCES_PER_PARAGRAPH = 4

/** Fallback when captions lack sentence punctuation (~2–3 lines at text-sm). */
const TRANSCRIPT_WORDS_PER_PARAGRAPH = 52

function splitSentencesInBlock(block: string): string[] {
  const b = block.trim()
  if (!b) return []
  return b.split(/(?<=[.!?…])\s+/u).filter((p) => p.length > 0)
}

function chunkSentencesToParagraphs(sentences: string[], maxPerParagraph: number): string[] {
  const paragraphs: string[] = []
  for (let i = 0; i < sentences.length; i += maxPerParagraph) {
    paragraphs.push(sentences.slice(i, i + maxPerParagraph).join(' '))
  }
  return paragraphs
}

function chunkWordsToParagraphs(text: string, wordsPerParagraph: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const paragraphs: string[] = []
  for (let i = 0; i < words.length; i += wordsPerParagraph) {
    paragraphs.push(words.slice(i, i + wordsPerParagraph).join(' '))
  }
  return paragraphs
}

/** Collapse caption-style line breaks into one flowing transcript string. */
function collapseTranscriptFlow(raw: string): string {
  return normalizeMultilineDisplayText(raw).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Rebuild transcript into readable paragraphs for UI.
 * Collapses short caption lines, groups by sentence when possible, otherwise by word count.
 */
export function splitTranscriptParagraphs(raw: string): string[] {
  const flowing = collapseTranscriptFlow(raw)
  if (!flowing) return []

  const sentences = splitSentencesInBlock(flowing)
  if (sentences.length > 1) {
    return chunkSentencesToParagraphs(sentences, TRANSCRIPT_MAX_SENTENCES_PER_PARAGRAPH)
  }

  return chunkWordsToParagraphs(flowing, TRANSCRIPT_WORDS_PER_PARAGRAPH)
}

/**
 * Transcript-only: split on sentence boundaries, group up to
 * {@link TRANSCRIPT_MAX_SENTENCES_PER_PARAGRAPH} sentences per paragraph, join paragraphs with blank lines.
 */
export function formatTranscriptParagraphs(raw: string): string {
  return splitTranscriptParagraphs(raw).join('\n\n')
}

/**
 * When text has no explicit newlines, add soft paragraph breaks after sentence
 * endings (`. ` followed by capital, `(`, or digit) so long blobs read in the UI.
 */
export function formatReadableMultiline(raw: string): string {
  const s = normalizeMultilineDisplayText(raw)
  if (!s || s.includes('\n')) return s
  if (s.length < 80) return s
  return s.replace(/(\.\s+)(?=[A-Z(]|\d)/g, '$1\n\n')
}
