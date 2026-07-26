type PreflightFailure = { error: string }

const APPROVED_EMOJI = new Set(['👇', '⏰', '✅', '🚨', '🙌'])

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function failure(error: string): PreflightFailure {
  return { error }
}

export function validateIgStoryRenderPreflight(
  data: Record<string, unknown>,
): PreflightFailure | null {
  const headlineLines = data.headline_lines
  if (!Array.isArray(headlineLines) || headlineLines.length === 0 || headlineLines.length > 4) {
    return failure('render_ig_story requires 1 to 4 headline_lines')
  }

  for (const field of ['url', 'pill_line', 'cta_line'] as const) {
    if (!stringValue(data[field])) return failure(`${field} is required`)
  }
  if (stringValue(data.pill_line).length > 40) {
    return failure('pill_line must be 40 characters or fewer')
  }
  if (stringValue(data.cta_line).length > 50) {
    return failure('cta_line must be 50 characters or fewer')
  }

  const lines = headlineLines.filter(
    (line): line is Record<string, unknown> =>
      Boolean(line) && typeof line === 'object' && !Array.isArray(line),
  )
  if (
    lines.length !== headlineLines.length ||
    lines.some((line) => !stringValue(line.text) || stringValue(line.text).length > 60)
  ) {
    return failure('each headline line requires text of 60 characters or fewer')
  }
  if (lines.filter((line) => line.highlighted === true).length !== 1) {
    return failure('exactly one headline line must be highlighted')
  }
  if (!APPROVED_EMOJI.has(stringValue(data.emoji))) {
    return failure('emoji must be one of the approved Apple-style emoji set')
  }
  return null
}
