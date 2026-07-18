export const WEBINAR_FULFILLMENT_PLAYBOOK_ID = 'webinar-fulfillment' as const

export type PlaybookKickoffFields = {
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
      'Atlas context → gated strategy → market research → one complete Copy Package → copy gate → Lux native production → Blaze media plan → production gate.',
  },
] as const

export function buildWebinarFulfillmentMissionPayload(fields: PlaybookKickoffFields) {
  const title = 'Webinar Fulfillment'
  const briefParts = [
    'Run the Webinar Fulfillment playbook for this client Space.',
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
        client_context: fields.client_context.trim() || undefined,
        transcript_url: fields.transcript_url.trim() || undefined,
        drive_links: fields.drive_links.trim() || undefined,
        notes: fields.notes.trim() || undefined,
      },
    },
  }
}
