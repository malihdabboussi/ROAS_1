'use client'

import Link from 'next/link'
import { Link2, RefreshCw, Send, Users } from 'lucide-react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'

const WORK_ITEMS = [
  {
    href: '/home?tab=manage&settings=integrations',
    label: 'Page Grader connection',
    icon: Link2,
  },
  {
    href: '/home?tab=manage&settings=integrations',
    label: 'Map client scopes',
    icon: Users,
  },
  {
    href: '/campaigns',
    label: 'Send to Page Grader',
    icon: Send,
  },
  {
    href: '/brain',
    label: 'Import client brain',
    icon: RefreshCw,
  },
] as const

export function SidebarWorkMenu() {
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const setChatCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const setMenuMode = useShellStore((s) => s.setMenuMode)

  return (
    <div className="scrollbar-hide min-h-0 flex-1 space-y-0.5 overflow-y-auto">
      <p className="hub-menu-section-label">Page Grader</p>
      {WORK_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          onClick={() => {
            setMenuMode('work')
            setWorkContext({ surface: 'general' })
            setChatCollapsed(true)
          }}
          className="hub-menu-link-row"
        >
          <Icon className="icon-md text-muted-foreground shrink-0" />
          <span className="body-3 truncate">{label}</span>
        </Link>
      ))}
    </div>
  )
}
