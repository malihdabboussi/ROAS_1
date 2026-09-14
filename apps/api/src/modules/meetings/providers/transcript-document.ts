import type { MeetingProviderId, TranscriptSourceEvent } from './transcript-source.types'

export const MEETING_PROVIDER_DISPLAY_NAMES: Record<MeetingProviderId, string> = {
  fathom: 'Fathom',
  fireflies: 'Fireflies',
  read_ai: 'Read AI',
}

/** The transcript document body stored on the meeting's transcript space item. */
export function renderTranscriptDocument(source: TranscriptSourceEvent): string {
  const providerName = MEETING_PROVIDER_DISPLAY_NAMES[source.provider] ?? source.provider
  const link = source.recordingUrl ?? source.sourceUrl
  const metadata = [
    `<p><strong>Provider:</strong> ${escapeHtml(providerName)}</p>`,
    source.recordingStart
      ? `<p><strong>Recorded:</strong> ${escapeHtml(source.recordingStart)}</p>`
      : '',
    link
      ? `<p><strong>Recording:</strong> <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`
      : '',
  ]
    .filter(Boolean)
    .join('')
  const turns = source.transcript
    .map((turn) => {
      const timestamp = turn.timestamp
        ? ` <time datetime="${escapeHtml(turn.timestamp)}">${escapeHtml(turn.timestamp)}</time>`
        : ''
      const speakerEmail = turn.speakerEmail
        ? ` <span>&lt;${escapeHtml(turn.speakerEmail)}&gt;</span>`
        : ''
      return [
        '<section>',
        `<p><strong>${escapeHtml(turn.speakerName)}</strong>${speakerEmail}${timestamp}</p>`,
        `<p>${escapeHtml(turn.text).replace(/\n/g, '<br>')}</p>`,
        '</section>',
      ].join('')
    })
    .join('')

  return [
    `<h1>TRANSCRIPT — ${escapeHtml(source.title)}</h1>`,
    metadata,
    '<hr>',
    turns || `<p>No transcript was supplied by ${escapeHtml(providerName)}.</p>`,
  ].join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
