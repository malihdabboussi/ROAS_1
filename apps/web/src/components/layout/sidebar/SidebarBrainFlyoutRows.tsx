'use client'

import Link from 'next/link'
import { type ComponentType, type ReactNode } from 'react'
import { BadgeCheck, MoreHorizontal, UserRound } from 'lucide-react'
import { getIconColor, type IconColorId } from '@/components/ui/IconPicker'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { brainHomeHref, brainScopeHref } from '@/features/brain/lib/brain-scope-nav'

export const CAMPAIGN_KNOWLEDGE_RECENT_LIMIT = 5
export const USER_BRAIN_RECENT_LIMIT = 5

/** Semantic tint per brain scope type so rows read like ClickUp colored tiles. */
const SCOPE_TILE_COLOR: Record<string, IconColorId> = {
  user: 'purple',
  person: 'blue',
  shared: 'cyan',
  company: 'orange',
  customer: 'green',
  agent: 'blue',
  campaign_knowledge: 'yellow',
}

/**
 * Render a brain row icon: real avatar image when present, otherwise a tinted
 * square tile with the fallback Lucide icon (matches Programs/Team tiles).
 */
export function scopeRowIcon(
  option: BrainScopeNavOption,
  FallbackIcon: ComponentType<{ className?: string }>,
): ReactNode {
  const imageUrl = option.imageUrl?.trim()
  if (imageUrl) {
    return <img src={imageUrl} alt="" className="hub-dock-flyout-avatar" />
  }
  const palette = getIconColor(SCOPE_TILE_COLOR[option.scopeType] ?? 'muted')
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${palette.glassClass}`}
    >
      <FallbackIcon className={`h-3 w-3 ${palette.textColor}`} />
    </span>
  )
}

export function sectionHeader(label: string) {
  return <p className="hub-dock-flyout-caption">{label}</p>
}

export function EnableBrainRow({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href={brainHomeHref()}
      data-hub-dock-navigate
      onClick={() => onNavigate?.()}
      className="hub-dock-flyout-row hub-dock-flyout-row-muted"
    >
      <span className="min-w-0 flex-1 truncate">Enable in Manage Brains</span>
    </Link>
  )
}

export function BrainScopeRow({
  option,
  pathname,
  currentScope,
  onNavigate,
  icon,
  menuOpen,
  onOpenMenu,
}: {
  option: BrainScopeNavOption
  pathname: string
  currentScope: string | null
  onNavigate?: () => void
  icon: ReactNode
  menuOpen: boolean
  onOpenMenu: (option: BrainScopeNavOption, clientX: number, clientY: number) => void
}) {
  const isActive = pathname.startsWith('/brain') && currentScope === option.id

  const openMenuAt = (clientX: number, clientY: number) => {
    onOpenMenu(option, clientX, clientY)
  }

  const openMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    onOpenMenu(option, rect.right - 224, rect.bottom + 4)
  }

  return (
    <div
      className="group/brain-scope relative flex items-center"
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openMenuAt(e.clientX, e.clientY)
      }}
    >
      <Link
        href={brainScopeHref(option.id)}
        data-hub-dock-navigate
        onClick={() => onNavigate?.()}
        className={`hub-dock-flyout-row pr-8 ${isActive ? 'hub-dock-flyout-row-active' : ''}`}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {option.scopeType === 'person' ? (
          option.personIdentityKind === 'portal' ? (
            <BadgeCheck className="text-primary h-3.5 w-3.5 shrink-0" aria-label="Portal account" />
          ) : (
            <UserRound
              className="text-muted-foreground h-3.5 w-3.5 shrink-0"
              aria-label="External person"
            />
          )
        ) : null}
      </Link>
      <div className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
        <button
          type="button"
          aria-label="Brain actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={openMenuFromButton}
          className={`absolute inset-0 flex items-center justify-center rounded p-0.5 text-[var(--color-muted-foreground)] transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover/brain-scope:opacity-100'
          }`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
