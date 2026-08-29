export function isFullHomeConversation(pathname: string, conversationId: string | null): boolean {
  return pathname === '/home' && Boolean(conversationId)
}
