interface FullShellConversationInput {
  pathname: string
  hasConversationParam: boolean
  workAreaOpen: boolean
  chatDrawerOpen: boolean
}

export function isFullShellConversation({
  pathname,
  hasConversationParam,
  workAreaOpen,
  chatDrawerOpen,
}: FullShellConversationInput): boolean {
  if (pathname === '/home' && hasConversationParam) return true
  return !workAreaOpen && chatDrawerOpen
}
