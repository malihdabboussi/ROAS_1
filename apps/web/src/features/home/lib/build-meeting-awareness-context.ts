import type { MeetingWorkspaceBundle } from '@/features/home/services/meeting-workspace-api'

export function buildMeetingAwarenessContext(input: {
  spaceId: string
  meetingItemId: string
  title: string
  bundle: MeetingWorkspaceBundle
}): string {
  const phase = input.bundle.workspace?.phase ?? 'scheduled'
  const recordings = input.bundle.recordings
  const actions = input.bundle.actions
    .filter((action) => action.status !== 'dismissed')
    .map(
      (action) =>
        `- [${action.status}] ${action.title} — ${action.canonical_assignee_name || 'unassigned'}`,
    )
    .join('\n')
  const snippets = input.bundle.snippets.map((snippet) => `- ${snippet.text}`).join('\n')
  const contextLinks = input.bundle.context_links
    .map(
      (link) =>
        `- ${String(link.entity_type ?? 'context')}:${String(link.entity_id ?? '')} (${String(link.source ?? 'linked')})`,
    )
    .join('\n')
  const recordingLines = recordings
    .map((recording) => {
      const role = recording.is_primary ? 'primary' : 'supplemental'
      const externalId = recording.external_recording_id?.trim()
      const external = externalId ? ` external_id=${externalId}` : ''
      return `- [${role}] ${recording.title}${external}`
    })
    .join('\n')

  const liveMode =
    phase === 'live'
      ? [
          'LIVE CALL MODE — the user is on the call and mostly brain-dumping notes into chat.',
          'Default response style: 1–3 short bullets or one short sentence. Acknowledge briefly.',
          'Do not write essays, frameworks, long plans, or multi-section strategy unless they explicitly ask for guidance, help, analysis, or a recommendation.',
          'When they only dump notes or screenshots: confirm captured in one line; at most one clarifying question.',
          'When they ask for guidance: still keep it tight — top 2–3 points, no fluff.',
        ].join('\n')
      : [
          'Meeting workspace chat. Prefer concise answers.',
          'Treat pasted text as possible call notes unless they clearly ask for a deliverable.',
        ].join('\n')

  const recordingGuidance =
    recordings.length === 0
      ? [
          'Linked recordings: none yet on this meeting workspace.',
          'If the user asks for the recording, transcript, or action items:',
          '1) First tell them to click Recordings + in the right meeting sidebar and pick the Fathom call — that links the recording into this workspace so you can use it.',
          '2) Optionally try Fathom via use_integration (list_meetings → match title/participants/time → get_transcript). If that tool fails or Fathom is unavailable to you, do not say “Fathom isn’t connected” as if the user’s account is broken — say you cannot pull Fathom from chat right now and they should use Recordings +.',
          'Do not invent a vague “check now” clarification. Do not claim the recording is missing from Fathom until list_meetings was tried or the user confirmed none exists.',
        ].join('\n')
      : [
          `Linked recordings (${recordings.length}):`,
          recordingLines,
          'When they ask for action items or transcript details, use the linked recording evidence first. Prefer workspace action items when present; otherwise read the Fathom transcript for the linked external_id.',
        ].join('\n')

  return [
    'You are the persistent AI partner inside a meeting workspace.',
    `Meeting phase: ${phase}`,
    `Meeting item: ${input.meetingItemId}`,
    `Meeting: ${input.title}`,
    `Space: ${input.spaceId}`,
    liveMode,
    recordingGuidance,
    actions ? `Action items:\n${actions}` : 'Action items: none yet',
    snippets ? `Chat notes and call snippets:\n${snippets}` : 'Chat notes: none yet',
    contextLinks ? `Linked company context:\n${contextLinks}` : 'Linked company context: none yet',
    agendaGuidance(input.bundle.workspace?.agenda_doc_item_id),
    'Do not send external messages or create tasks unless the user explicitly asks.',
  ].join('\n\n')
}

function agendaGuidance(agendaDocItemId: string | null | undefined): string {
  const id = agendaDocItemId?.trim()
  if (!id) {
    return 'No editable agenda Space Doc is linked yet. If they ask to prep or start the agenda, write it in a ```draft Agenda``` fence.'
  }
  return [
    `Editable agenda Space Doc is on the right (space_item_id=${id}).`,
    'When they ask to prep, start, or write the agenda, update that document with update_document using that id.',
    'They edit it on the right like a Space Doc. Do not only use a draft fence.',
  ].join(' ')
}
