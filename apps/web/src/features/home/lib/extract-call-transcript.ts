/** Extract full transcript text from a loaded call space item (lazy modal load). */
export function extractCallTranscriptText(input: {
  description?: string | null
  custom_data?: Record<string, unknown> | null
}): string | null {
  const custom = input.custom_data ?? {}
  if (typeof custom.transcript_text === 'string' && custom.transcript_text.trim()) {
    return custom.transcript_text.trim()
  }
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  if (!description) return null
  // Legacy rows stored the transcript in description when no summary existed.
  if (description.length > 1800 || /\n\s*[A-Z][a-z]+:\s/.test(description.slice(0, 400))) {
    return description
  }
  return null
}
