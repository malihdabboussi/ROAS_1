'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import type { NavSection } from '@/lib/types'

interface MobileNavProps {
  navigation: NavSection[]
}

export function MobileNav({ navigation }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mr-3 lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div
            className="search-dialog-backdrop fixed inset-0 z-50"
            onClick={() => setOpen(false)}
          />
          <div
            className="sidebar-glass fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto shadow-xl"
            style={{ background: 'var(--background)' }}
          >
            <div
              className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
                Navigation
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-6 px-3 py-4">
              {navigation.map((section) => (
                <div key={section.group}>
                  <p className="text-muted-foreground mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider">
                    {section.group}
                  </p>
                  <ul className="space-y-0.5">
                    {section.links.map((link) => (
                      <li key={link.slug}>
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="text-muted-foreground nav-item-hover block rounded-md px-2 py-1.5 text-[14px] transition-all"
                        >
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
