import type { PlaybookKickoffFields } from './webinar-fulfillment'

export const CLIENT_LIFECYCLE_PLAYBOOK_ID = 'client-lifecycle' as const

export function buildClientLifecycleMissionPayload(fields: PlaybookKickoffFields) {
  const briefParts = [
    'Run the client lifecycle from source-of-truth review through fundamentals, strategy, campaign planning, production decisions, launch readiness, and optimization.',
    fields.client_context.trim() ? `Client context: ${fields.client_context.trim()}` : null,
    fields.transcript_url.trim() ? `Starting transcript: ${fields.transcript_url.trim()}` : null,
    fields.drive_links.trim() ? `Drive/links: ${fields.drive_links.trim()}` : null,
    fields.notes.trim() ? `Notes: ${fields.notes.trim()}` : null,
  ].filter(Boolean)

  return {
    title: 'Client Lifecycle',
    brief: briefParts.join('\n'),
    priority: 'high' as const,
    input: {
      playbook_id: CLIENT_LIFECYCLE_PLAYBOOK_ID,
      playbook_kickoff: {
        client_context: fields.client_context.trim() || undefined,
        transcript_url: fields.transcript_url.trim() || undefined,
        drive_links: fields.drive_links.trim() || undefined,
        notes: fields.notes.trim() || undefined,
      },
    },
  }
}
