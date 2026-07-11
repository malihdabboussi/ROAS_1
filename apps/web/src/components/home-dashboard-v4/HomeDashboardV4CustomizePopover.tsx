'use client'

import { useMemo, useState } from 'react'
import {
  Bell,
  Bot,
  Calendar,
  CheckSquare,
  Clock,
  FolderKanban,
  LayoutGrid,
  MessageSquare,
  SlidersHorizontal,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  HomeDashboardV4Menu,
  HomeDashboardV4MenuItem,
  HomeDashboardV4MenuLabel,
} from '@/components/home-dashboard-v4/HomeDashboardV4Menu'
import { HOME_CARD_DEFINITIONS, homeCardDefinition } from '@/features/home/config/home-cards.config'
import type { HomeCardId } from '@/features/home/types/home-cards'
import { cn } from '@/lib/utils/cn'

const HOME_CARD_ICONS: Record<HomeCardId, LucideIcon> = {
  favorite_spaces: LayoutGrid,
  favorite_conversations: MessageSquare,
  favorite_campaigns: FolderKanban,
  my_tasks: CheckSquare,
  approval_queue: Bot,
  notification_feed: Bell,
  org_pulse: Zap,
  recent_communications: MessageSquare,
  recent_conversations: Clock,
  completed_automations: Zap,
  agenda: Calendar,
}

export function HomeDashboardV4CustomizePopover({
  visibleCardIds,
  activeOrgId,
  onToggleCard,
  editing,
  onToggleEditing,
}: {
  visibleCardIds: HomeCardId[]
  activeOrgId: string | null
  onToggleCard: (id: HomeCardId) => void
  editing: boolean
  onToggleEditing: () => void
}) {
  const [open, setOpen] = useState(false)

  const cardOptions = useMemo(
    () =>
      HOME_CARD_DEFINITIONS.filter((def) => {
        if (def.orgOnly && !activeOrgId) return false
        return true
      }),
    [activeOrgId],
  )

  return (
    <div className="relative flex items-center gap-2">
      {editing ? (
        <button
          type="button"
          onClick={onToggleEditing}
          className="text-[13px] font-medium text-[var(--hd4-primary)]"
        >
          Done
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggleEditing}
          className="text-[12px] text-[var(--hd4-text-3)] hover:text-[var(--hd4-text)]"
        >
          Reorder
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn('hd4-customize-btn', open && 'hd4-customize-btn-open')}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        Customize
      </button>
      <HomeDashboardV4Menu open={open} onClose={() => setOpen(false)} width={300} align="right">
        <HomeDashboardV4MenuLabel>Dashboard cards</HomeDashboardV4MenuLabel>
        {cardOptions.map((def) => {
          const Icon = HOME_CARD_ICONS[def.id]
          const on = visibleCardIds.includes(def.id)
          return (
            <HomeDashboardV4MenuItem
              key={def.id}
              icon={Icon}
              label={homeCardDefinition(def.id).title}
              sub={def.description}
              onClick={() => onToggleCard(def.id)}
              right={
                <div className={cn('hd4-toggle', on && 'hd4-toggle-on')}>
                  <div className="hd4-toggle-knob" />
                </div>
              }
            />
          )
        })}
      </HomeDashboardV4Menu>
    </div>
  )
}
