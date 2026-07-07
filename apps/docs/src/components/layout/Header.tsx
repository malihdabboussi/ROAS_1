'use client'

import Link from 'next/link'
import type { NavSection, SearchEntry } from '@/lib/types'
import { docsConfig } from '../../../docs.config'
import { SearchDialog } from '../search/SearchDialog'
import { ThemeToggle } from '../ThemeToggle'
import { MobileNav } from './MobileNav'

interface HeaderProps {
  navigation?: NavSection[]
  searchEntries?: SearchEntry[]
}

export function Header({ navigation = [], searchEntries = [] }: HeaderProps) {
  return (
    <header className="header-glass sticky top-0 z-50 w-full">
      <div className="flex h-14 items-center px-6">
        <MobileNav navigation={navigation} />
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <img src="/logo-light.png" alt="Vibey" className="h-8 w-auto dark:hidden" />
          <img src="/logo-dark.png" alt="Vibey" className="hidden h-8 w-auto dark:block" />
          <span className="text-[14px] font-normal" style={{ color: 'var(--muted-foreground)' }}>
            Docs
          </span>
        </Link>

        <div className="flex flex-1 justify-center">
          <SearchDialog entries={searchEntries} />
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="https://app.vibey.im/register"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-4 py-1.5 text-[14px] font-semibold no-underline transition-colors"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: 'var(--foreground)',
            }}
          >
            Get Early Access
          </a>
          <a
            href={docsConfig.loginUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item-active rounded-lg px-4 py-1.5 text-[14px] font-medium no-underline"
          >
            Log In
          </a>
        </div>
      </div>
    </header>
  )
}
