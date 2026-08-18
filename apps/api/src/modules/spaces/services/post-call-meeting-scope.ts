export type PostCallMeetingScope = 'all' | 'client' | 'team' | 'client_and_team'

export function readMeetingCallKind(item: Record<string, unknown>): string {
  const customData =
    item.custom_data && typeof item.custom_data === 'object'
      ? (item.custom_data as Record<string, unknown>)
      : {}
  return String(customData.call_kind ?? 'unknown')
}

export function shouldRunPostCallSlackAction(
  action: Record<string, unknown>,
  item: Record<string, unknown>,
): boolean {
  const callKind = readMeetingCallKind(item)
  // Personal calls stay confidential and never enter the post-call bot.
  if (callKind === 'private') return false

  const scope = action.meeting_scope
  if (scope === 'client') return callKind === 'client'
  if (scope === 'team') return callKind === 'team'
  if (scope === 'client_and_team') return callKind === 'client' || callKind === 'team'
  return true
}
