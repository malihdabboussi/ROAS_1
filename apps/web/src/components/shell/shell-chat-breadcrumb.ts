interface FullShellConversationInput {
  pathname: string
  hasConversationParam: boolean
  spaceWorkOpen: boolean
  chatDrawerOpen: boolean
}

export function isFullShellConversation({
  pathname,
  hasConversationParam,
  spaceWorkOpen,
  chatDrawerOpen,
}: FullShellConversationInput): boolean {
  if (pathname === '/home' && hasConversationParam) return true
  return pathname.startsWith('/spaces') && !spaceWorkOpen && chatDrawerOpen
}
