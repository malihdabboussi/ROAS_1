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
  const page = input.rememberedPage
  if (page) {
    return { href: page.href, openDrawer: true, restore: page.restore }
  }
  if (input.simpleSidebar) {
    return {
      href: `/home?conv=${encodeURIComponent(input.conversationId)}`,
      openDrawer: false,
      restore: undefined,
    }
  }
  if (isShellHomeRoute(input.pathname) && input.hasHomeConvParam) {
    return { href: '/home', openDrawer: true, restore: undefined }
  }
  return { href: null, openDrawer: true, restore: undefined }
}
