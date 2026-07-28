export function renderUnifiedMeetingRecap(input: {
  title: string
  recordings: Record<string, unknown>[]
  actions: Record<string, unknown>[]
}): string {
  const recordings = input.recordings
    .map((recording, index) => {
      const summary = text(recording.provider_summary)
      if (!summary) return ''
      const label = `${recording.is_primary === true ? 'Primary' : `Source ${index + 1}`} — ${text(recording.title) ?? 'Recording'}`
      const url = httpUrl(recording.recording_url)
      return [
        `<section><h2>${escapeHtml(label)}</h2>`,
        url ? `<p><a href="${escapeHtml(url)}">Open recording</a></p>` : '',
        `<p>${escapeHtml(summary).replace(/\n/g, '<br>')}</p></section>`,
      ].join('')
    })
    .filter(Boolean)
    .join('')
  const actions = input.actions
    .map((action) => {
      const owner = text(action.canonical_assignee_name)
      return `<li>${escapeHtml(String(action.title ?? ''))}${owner ? ` — ${escapeHtml(owner)}` : ''}</li>`
    })
    .join('')

  return [
    `<h1>${escapeHtml(input.title.toUpperCase())}</h1>`,
    '<h2>Provider summaries</h2>',
    recordings || '<p>No provider summary was supplied.</p>',
    '<h2>Action items</h2>',
    actions ? `<ul>${actions}</ul>` : '<p>No provider action items were supplied.</p>',
  ].join('')
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function httpUrl(value: unknown): string | null {
  const valueText = text(value)
  return valueText && /^https?:\/\//i.test(valueText) ? valueText : null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
