'use client'

import Link from 'next/link'
import { useLayoutEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'
import type { NavSection } from '@/lib/types'

interface SidebarProps {
  navigation: NavSection[]
  currentSlug: string
}

const SCROLL_KEY = '__docs_sidebar_scroll'

export function Sidebar({ navigation, currentSlug }: SidebarProps) {
  const navRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved) {
      nav.scrollTop = Number(saved)
    }
  }, [currentSlug])

  const handleLinkClick = () => {
    if (navRef.current) {
      sessionStorage.setItem(SCROLL_KEY, String(navRef.current.scrollTop))
    }
  }

  return (
    <aside className="sidebar-glass hidden w-64 shrink-0 lg:block">
      <nav ref={navRef} className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-3 py-6">
        <div className="space-y-6">
          {navigation.map((section) => (
            <SidebarSection
              key={section.group}
              section={section}
              currentSlug={currentSlug}
              onLinkClick={handleLinkClick}
            />
          ))}
        </div>
      </nav>
    </aside>
  )
}

function SidebarSection({
  section,
  currentSlug,
  onLinkClick,
}: {
  section: NavSection
  currentSlug: string
  onLinkClick: () => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="hover:text-foreground mb-2 flex w-full items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider transition-colors"
        style={{ color: 'var(--foreground)' }}
      >
        {section.group}
        <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <ul className="space-y-0.5">
          {section.links.map((link) => {
            const isActive = link.slug === currentSlug
            return (
              <li key={link.slug}>
                <Link
                  href={link.href}
                  onClick={onLinkClick}
                  data-active={isActive || undefined}
                  className={clsx(
                    'block rounded-md px-2 py-1.5 text-[14px] transition-all',
                    isActive
                      ? 'nav-item-active font-medium'
                      : 'nav-item-hover text-muted-foreground',
                  )}
                >
                  {link.title}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
