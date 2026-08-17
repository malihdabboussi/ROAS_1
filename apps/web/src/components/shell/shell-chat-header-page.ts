export function isFullHomeConversation(pathname: string, conversationId: string | null): boolean {
  return pathname === '/home' && Boolean(conversationId)
}

/** Last real work page — never a conversation URL, Home chat, or /chats. */
export function resolveWorkAreaRestoreHref(
  recentPages: Array<{ href: string }>,
  fallback = '/home/meetings',
): string {
  const page = recentPages.find((target) => {
    const params = new URLSearchParams(target.href.split('?')[1] ?? '')
    if (params.has('conv') || target.href.startsWith('/chats')) return false
    if (target.href === '/home' || target.href.startsWith('/home?')) return false
    return true
  })
  return page?.href ?? fallback
}
