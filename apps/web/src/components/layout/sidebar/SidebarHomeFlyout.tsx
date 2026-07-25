'use client'

import Link from 'next/link'
import { CalendarDays, CheckSquare, House, Inbox } from 'lucide-react'

const HOME_LINKS = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/home/inbox', label: 'Inbox', icon: Inbox },
  { href: '/home/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/home/my-tasks', label: 'My Tasks', icon: CheckSquare },
] as const

export function SidebarHomeFlyout({ pathname }: { pathname: string }) {
  return (
    <nav className="p-spacing-2 gap-spacing-1 flex flex-col">
      {HOME_LINKS.map((item) => {
        const Icon = item.icon
        const active = item.href === '/home' ? pathname === '/home' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            data-hub-dock-navigate
            className={`body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center transition-colors ${
              active
                ? 'nav-glass-selected-purple text-foreground'
                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
            }`}
          >
            <Icon className="icon-sm shrink-0" aria-hidden />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
