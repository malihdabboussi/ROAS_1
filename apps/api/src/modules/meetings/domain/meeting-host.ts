export type MeetingHostRef = {
  email: string
  name: string
}

export type MeetingHostPerson = {
  email?: string | null
  name?: string | null
}

export function resolveMeetingHost(input: {
  organizer?: MeetingHostPerson | null
  recordedBy?: MeetingHostPerson | null
}): MeetingHostRef | null {
  return personToHost(input.organizer) ?? personToHost(input.recordedBy)
}

export function shouldStampMeetingHost(customData: Record<string, unknown>): boolean {
  const email = text(customData.host_email)
  const name = text(customData.host)
  return !email && !name
}

export function meetingHostCustomData(host: MeetingHostRef | null): {
  host?: string
  host_email?: string
} {
  if (!host) return {}
  return { host: host.name, host_email: host.email }
}

function personToHost(person: MeetingHostPerson | null | undefined): MeetingHostRef | null {
  const email = text(person?.email)?.toLowerCase() ?? null
  if (!email || !email.includes('@')) return null
  return { email, name: text(person?.name) ?? email }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
