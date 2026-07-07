'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Brain, Inbox, ListChecks, Users } from 'lucide-react'

interface MobileNavItem {
  id: string
  label: string
  href?: string
  icon: React.ReactNode
  openModal?: 'account' | 'workspace'
}

const createNavItems: MobileNavItem[] = [
  {
    id: 'studio',
    label: 'Team',
    href: '/team',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
    ),
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    href: '/campaigns',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
        />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/campaigns?view=dashboard',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 19.5h16M7 16V9M12 16V5.5M17 16v-7"
        />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'More',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
    ),
    openModal: 'account',
  },
]

const manageNavItems: MobileNavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/home',
    icon: <Inbox className="h-5 w-5" />,
  },
  { id: 'spaces', label: 'Spaces', href: '/spaces', icon: <ListChecks className="h-5 w-5" /> },
  { id: 'team-manage', label: 'Team', href: '/team', icon: <Users className="h-5 w-5" /> },
  { id: 'brain', label: 'Brain', href: '/brain', icon: <Brain className="h-5 w-5" /> },
]

const MANAGE_ROUTES = ['/home', '/spaces', '/team', '/brain', '/projects', '/flows', '/campaigns']

export function MobileNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (pathname === '/team' || pathname.startsWith('/team/')) return null

  const isManageRoute = MANAGE_ROUTES.some((r) => pathname.startsWith(r))
  const navItems = isManageRoute ? manageNavItems : createNavItems

  function isActive(itemId: string, href: string): boolean {
    if (itemId === 'dashboard') {
      return (
        pathname.startsWith('/campaigns') &&
        (searchParams.get('view') === 'dashboard' || searchParams.get('tab') === 'dashboard')
      )
    }

    if (itemId === 'campaigns') {
      return pathname.startsWith('/campaigns') && searchParams.get('view') !== 'dashboard'
    }

    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-[var(--card)]/90 fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] md:hidden">
      <div className="flex items-center gap-2 px-2 py-2">
        {navItems.map((item) => {
          const active = item.href ? isActive(item.id, item.href) : false
          const baseClass = `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10px] transition-all ${
            active
              ? 'nav-glass-selected-purple nav-glass-text-purple'
              : 'nav-glass-hover-purple text-[var(--color-muted-foreground)]'
          }`
          if (item.openModal === 'account') {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('open-account-settings', { detail: 'profile' }),
                  )
                }
                className={baseClass}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            )
          }
          return (
            <Link key={item.id} href={item.href!} className={baseClass}>
              {item.icon}
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
