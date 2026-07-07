'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  DollarSign,
  FileCheck,
  Hammer,
  LayoutDashboard,
  Mail,
  Monitor,
  ScrollText,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type NavSection = {
  title?: string
  links: { href: string; label: string; icon: LucideIcon }[]
}

const navSections: NavSection[] = [
  {
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/users', label: 'Users', icon: Users },
      { href: '/finances', label: 'Revenue', icon: DollarSign },
    ],
  },
  {
    title: 'Enterprise Tools',
    links: [{ href: '/enterprise-tools/skill-builder', label: 'Skill Builder', icon: Hammer }],
  },
  {
    title: 'Development',
    links: [
      { href: '/dev-dashboard', label: 'Dev Dashboard', icon: Monitor },
      { href: '/instruction-governance', label: 'Instructions', icon: FileCheck },
      { href: '/mission-reliability', label: 'Missions', icon: Activity },
      { href: '/traces', label: 'Agent Traces', icon: ScrollText },
      { href: '/errors', label: 'Errors', icon: AlertTriangle },
    ],
  },
  {
    title: 'User Communication',
    links: [
      { href: '/waitlist', label: 'Waitlist', icon: UserPlus },
      { href: '/settings/platform-email', label: 'Email Settings', icon: Mail },
    ],
  },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const onLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <aside className="surface-card flex w-64 flex-col border-r border-[var(--border)]">
        <div className="gap-spacing-3 px-spacing-6 py-spacing-4 flex flex-row items-center">
          <img
            src="/Logos/logov2_transperent.png"
            alt="Vibey"
            className="h-spacing-10 w-spacing-10 object-contain"
          />
          <span className="body-1 text-foreground font-medium">Admin Dashboard</span>
        </div>
        <nav className="px-spacing-3 py-spacing-4 flex-1 overflow-y-auto">
          {navSections.map((section) => (
            <div
              key={section.title ?? 'main'}
              className={section.title ? 'mt-spacing-5 first:mt-0' : ''}
            >
              {section.title && (
                <p className="body-4 text-muted-foreground px-spacing-3 pb-spacing-2 pt-spacing-1 font-semibold tracking-wide">
                  {section.title}
                </p>
              )}
              <div className="space-y-spacing-1">
                {section.links.map((link) => {
                  const isActive =
                    pathname === link.href || pathname.startsWith(`${link.href}/`)
                  const buttonClass = `group w-full flex items-center gap-spacing-3 px-spacing-3 py-spacing-2 text-left body-1 transition-all duration-200 rounded-spacing-2 ${
                    isActive
                      ? 'nav-glass-selected-purple nav-glass-text-purple'
                      : 'text-muted-foreground nav-glass-hover-purple border border-transparent'
                  }`
                  return (
                    <Link key={link.href} href={link.href} className="block">
                      <button
                        className={buttonClass}
                        style={{ fontWeight: 'var(--font-weight-medium)' }}
                      >
                        <link.icon className="icon-sm shrink-0" />
                        <span>{link.label}</span>
                      </button>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-spacing-3 border-t border-[var(--border)]">
          <button
            onClick={() => void onLogout()}
            className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 w-full text-left"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="surface-bg flex-1 overflow-auto">
        <div className="app-content p-spacing-6 h-full">{children}</div>
      </main>
    </div>
  )
}
