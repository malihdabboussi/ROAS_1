export function shouldRunPostCallSlackAction(
  action: Record<string, unknown>,
  item: Record<string, unknown>,
): boolean {
  if (action.meeting_scope !== 'client') return true
  const customData =
    item.custom_data && typeof item.custom_data === 'object'
      ? (item.custom_data as Record<string, unknown>)
      : {}
  return customData.call_kind === 'client'
}
