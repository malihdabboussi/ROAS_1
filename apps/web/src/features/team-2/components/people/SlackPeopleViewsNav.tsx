'use client'

import { MessageSquareText, MessagesSquare, Radio, UsersRound } from 'lucide-react'

export type SlackPeopleViewKey = 'people' | 'shadow' | 'signals' | 'channels'

const VIEWS = [
  { key: 'people' as const, label: 'People', icon: UsersRound },
  { key: 'shadow' as const, label: 'Conversations', icon: MessageSquareText },
  { key: 'signals' as const, label: 'Signals', icon: Radio },
  { key: 'channels' as const, label: 'Channels', icon: MessagesSquare },
]

export function SlackPeopleViewsNav({
  active,
  onChange,
}: {
  active: SlackPeopleViewKey
  onChange: (view: SlackPeopleViewKey) => void
}) {
  return (
    <nav
      aria-label="People views"
      className="surface-card border-border p-spacing-1 rounded-spacing-3 flex w-fit border"
    >
      {VIEWS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-current={active === key ? 'page' : undefined}
          className={
            active === key
              ? 'button-compact button-glass-neutral bg-secondary'
              : 'button-compact button-glass-neutral'
          }
        >
          <Icon className="icon-xs" /> {label}
        </button>
      ))}
    </nav>
  )
}
