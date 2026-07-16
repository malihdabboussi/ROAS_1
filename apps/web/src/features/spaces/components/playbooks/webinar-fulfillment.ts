export const WEBINAR_FULFILLMENT_PLAYBOOK_ID = 'webinar-fulfillment' as const

export type PlaybookStartAt = 'pre_call' | 'post_call' | 'launch_brief'

export type PlaybookKickoffFields = {
  start_at: PlaybookStartAt
  client_context: string
  transcript_url: string
  drive_links: string
  notes: string
}

export const SPACE_MISSION_PLAYBOOKS = [
  {
    id: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
    title: 'Webinar Fulfillment',
    description:
      'Strategy (skills 1→2→3) → Gate 1 human approve. Copy and creative phases unlock when those skills are ready.',
  },
] as const

export function buildWebinarFulfillmentMissionPayload(fields: PlaybookKickoffFields) {
  const title = 'Webinar Fulfillment'
  const briefParts = [
    'Run the Webinar Fulfillment playbook for this client Space.',
    `Start at: ${fields.start_at}.`,
    fields.client_context.trim() ? `Client context: ${fields.client_context.trim()}` : null,
    fields.transcript_url.trim() ? `Transcript: ${fields.transcript_url.trim()}` : null,
    fields.drive_links.trim() ? `Drive/links: ${fields.drive_links.trim()}` : null,
    fields.notes.trim() ? `Notes: ${fields.notes.trim()}` : null,
  ].filter(Boolean)

  return {
    title,
    brief: briefParts.join('\n'),
    priority: 'high' as const,
    input: {
      playbook_id: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
      playbook_kickoff: {
        start_at: fields.start_at,
        client_context: fields.client_context.trim() || undefined,
        transcript_url: fields.transcript_url.trim() || undefined,
        drive_links: fields.drive_links.trim() || undefined,
        notes: fields.notes.trim() || undefined,
      },
    },
  }
}
