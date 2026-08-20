import { isShellHomeRoute } from './shell-route-policy'
import type { ShellWorkAreaPageTarget } from './shell-work-area-page'

export function historyConversationOpenPlan(input: {
  conversationId: string
  simpleSidebar: boolean
  rememberedPage: ShellWorkAreaPageTarget | undefined
  pathname: string
  hasHomeConvParam: boolean
}): {
  href: string | null
  openDrawer: boolean
  restore: ShellWorkAreaPageTarget['restore']
} {
  // Simple Recents always opens the thread. Remembered meeting/work pages stay
  // on Show page — restoring them here hid the chat (greeting + files) then
  // crashed Meetings on an unmatched ?meeting= identity.
  if (input.simpleSidebar) {
    return {
      href: `/home?conv=${encodeURIComponent(input.conversationId)}`,
      openDrawer: false,
      restore: undefined,
    }
  }
  const page = input.rememberedPage
  if (page) {
    return { href: page.href, openDrawer: true, restore: page.restore }
  }
  if (isShellHomeRoute(input.pathname) && input.hasHomeConvParam) {
    return { href: '/home', openDrawer: true, restore: undefined }
  }
  return { href: null, openDrawer: true, restore: undefined }
}
