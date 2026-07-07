'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TopBarProps {
  userName?: string
  avatarUrl?: string | null
}

export function TopBar({ userName, avatarUrl }: TopBarProps) {
  const [showMenu, setShowMenu] = useState(false)
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = 'https://vibey.im'
  }

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <header className="bg-[var(--card)]/80 flex h-16 flex-shrink-0 items-center justify-between border-b border-[var(--border)] px-4 md:px-6">
      {/* Left: Mobile logo + Campaign selector */}
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] md:hidden">
          <span className="text-sm font-bold text-[var(--primary-foreground)]">V</span>
        </div>

        {/* Campaign selector */}
        <div className="hidden items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 text-sm sm:flex">
          <svg
            className="h-4 w-4 text-[var(--muted-foreground)]"
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
          <span className="text-[var(--muted-foreground)]">All Campaigns</span>
          <svg
            className="h-3 w-3 text-[var(--muted-foreground)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* Right: User avatar */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-[var(--secondary)]"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName ?? 'User'}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]">
              <span className="text-xs font-bold text-[var(--primary-foreground)]">{initials}</span>
            </div>
          )}
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-xl">
              <div className="border-b border-[var(--border)] px-3 py-2">
                <p className="text-sm font-medium text-[var(--foreground)]">{userName ?? 'User'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
