export function normalizeMeetingActionText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function meetingActionTextsMatch(left: string, right: string): boolean {
  const a = normalizeMeetingActionText(left)
  const b = normalizeMeetingActionText(right)
  if (!a || !b) return false
  return a === b
}

export function findMatchingMeetingAction<T extends Record<string, unknown>>(
  existing: readonly T[],
  candidateText: string,
): T | null {
  const needle = normalizeMeetingActionText(candidateText)
  if (!needle) return null
  for (const row of existing) {
    const title = typeof row.title === 'string' ? row.title : ''
    const sourceText = typeof row.source_text === 'string' ? row.source_text : ''
    if (meetingActionTextsMatch(title, needle) || meetingActionTextsMatch(sourceText, needle)) {
      return row
    }
  }
  return null
}
