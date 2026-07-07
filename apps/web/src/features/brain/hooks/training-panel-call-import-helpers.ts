type MeetingIdentity = {
  id?: string
  recording_id?: string
  call_id?: string
  url?: string
  title?: string
}

type MeetingTimestamp = {
  created_at?: string
}

export function formatTrainingPanelMeetingTime(iso?: string | number): string {
  if (!iso) return 'Unknown time'
  const date = typeof iso === 'number' ? new Date(iso * 1000) : new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

export function getTrainingPanelMeetingId(meeting: MeetingIdentity): string {
  return String(
    meeting.id || meeting.recording_id || meeting.call_id || meeting.url || meeting.title,
  )
}

export function sortTrainingPanelFathomMeetings<T extends MeetingTimestamp>(meetings: T[]): T[] {
  return [...meetings].sort((a, b) => {
    const left = new Date(a.created_at ?? 0).getTime()
    const right = new Date(b.created_at ?? 0).getTime()
    return right - left
  })
}
