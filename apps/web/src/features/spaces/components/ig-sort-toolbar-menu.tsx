'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { getAllSocialResearchConfig } from '../lib/all-social-research'
import { useResearchTopicToolbarBridgeStore } from '../store/use-research-topic-toolbar-bridge'
import {
  DEFAULT_SOCIAL_RESEARCH_CONFIG,
  socialResearchConfigKeyForPlatform,
  type SocialPlatform,
  type SocialResearchConfig,
  type ViewDef,
} from '../types/space-schema'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'

const SORT_FIELD_OPTIONS: { id: NonNullable<SocialResearchConfig['sort_by']>; label: string }[] = [
  { id: 'outlier_score', label: 'Outlier' },
  { id: 'play_count', label: 'Views' },
  { id: 'taken_at', label: 'Date' },
]

function getSocialConfig(
  view: ViewDef,
  configKey:
    | 'ig_research_config'
    | 'tiktok_research_config'
    | 'youtube_research_config'
    | 'twitter_research_config',
): SocialResearchConfig {
  return { ...DEFAULT_SOCIAL_RESEARCH_CONFIG, ...view[configKey] }
}

export function IgSortToolbarMenu({
  open,
  onClose,
  anchorRef,
  onViewPatch,
  activeView,
  platform = 'instagram',
  topicMode = false,
}: {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  onViewPatch: (patch: Partial<ViewDef>) => void | Promise<void>
  activeView: ViewDef
  /** Defaults to 'instagram' so existing call sites keep working without churn. */
  platform?: SocialPlatform
  /** When true, sort updates the active topic-search panel instead of only the people feed. */
  topicMode?: boolean
}) {
  const topicBridge = useResearchTopicToolbarBridgeStore((s) => s.bridge)
  const isAllSocial = activeView.type === 'all_social_research'
  const configKey = isAllSocial
    ? ('all_social_research_config' as const)
    : socialResearchConfigKeyForPlatform(platform)
  const ic = isAllSocial
    ? getAllSocialResearchConfig(activeView)
    : getSocialConfig(activeView, configKey as 'ig_research_config')
  const useTopicSavedBridge = topicMode && topicBridge?.hasResults && topicBridge.isSavedSnapshot
  const useTopicLiveBridge = topicMode && topicBridge?.hasResults && !topicBridge.isSavedSnapshot
  const useTopicBridge = useTopicSavedBridge || useTopicLiveBridge
  const activeSortBy = useTopicLiveBridge
    ? topicBridge.sortApplied
      ? topicBridge.sortBy
      : null
    : useTopicSavedBridge
      ? topicBridge.sortBy
      : (ic.sort_by ?? 'outlier_score')
  const activeSortDir = useTopicLiveBridge
    ? topicBridge.sortApplied
      ? topicBridge.sortDir
      : null
    : useTopicSavedBridge
      ? topicBridge.sortDir
      : (ic.sort_dir ?? 'desc')
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const menuW = 260
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    let left = rect.left
    if (left + menuW > vw - 8) left = Math.max(8, vw - menuW - 8)
    setPos({ top: rect.bottom + 6, left })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const reposition = () => {
      if (!anchorRef.current) return
      const rect = anchorRef.current.getBoundingClientRect()
      const menuW = 260
      const vw = window.innerWidth
      let left = rect.left
      if (left + menuW > vw - 8) left = Math.max(8, vw - menuW - 8)
      setPos({ top: rect.bottom + 6, left })
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose, anchorRef])

  if (!open || !pos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
      className="dropdown-menu-solid fixed z-[99999] w-[16.25rem] rounded-xl py-2 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      <p className="px-3 pb-1 text-xs font-medium text-[var(--color-muted-foreground)]">Sort by</p>
      {SORT_FIELD_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            if (useTopicBridge) {
              topicBridge.setSortBy(opt.id)
              return
            }
            void onViewPatch({
              [configKey]: { ...ic, sort_by: opt.id },
            })
          }}
          className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
        >
          <span>{opt.label}</span>
          {activeSortBy === opt.id ? (
            <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
          ) : null}
        </button>
      ))}
      <div className="my-1 border-t border-[var(--border)]" />
      <p className="px-3 pb-1 pt-1 text-xs font-medium text-[var(--color-muted-foreground)]">
        Direction
      </p>
      {(['asc', 'desc'] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => {
            if (useTopicBridge) {
              topicBridge.setSortDir(dir)
              return
            }
            void onViewPatch({
              [configKey]: { ...ic, sort_dir: dir },
            })
          }}
          className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
        >
          <span>{dir === 'asc' ? 'Ascending (A-Z)' : 'Descending (Z-A)'}</span>
          {activeSortDir === dir ? (
            <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
          ) : null}
        </button>
      ))}
    </div>,
    document.body,
  )
}
