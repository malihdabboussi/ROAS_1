import type { PlaybookKickoffFields } from './webinar-fulfillment'

export const CLIENT_STRATEGY_PLAYBOOK_ID = 'client-strategy' as const

export function buildClientStrategyMissionPayload(fields: PlaybookKickoffFields) {
  const title = 'Client Strategy'
  const briefParts = [
    'Prepare a campaign-aligned strategy map before the next client call.',
    fields.client_context.trim() ? `Client context: ${fields.client_context.trim()}` : null,
    fields.transcript_url.trim() ? `Existing transcript: ${fields.transcript_url.trim()}` : null,
    fields.drive_links.trim() ? `Drive/links: ${fields.drive_links.trim()}` : null,
    fields.notes.trim() ? `Notes: ${fields.notes.trim()}` : null,
  ].filter(Boolean)

  return {
    title,
    brief: briefParts.join('\n'),
    priority: 'high' as const,
    input: {
      playbook_id: CLIENT_STRATEGY_PLAYBOOK_ID,
      playbook_kickoff: {
        client_context: fields.client_context.trim() || undefined,
        transcript_url: fields.transcript_url.trim() || undefined,
        drive_links: fields.drive_links.trim() || undefined,
        notes: fields.notes.trim() || undefined,
      },
    },
  }
}
