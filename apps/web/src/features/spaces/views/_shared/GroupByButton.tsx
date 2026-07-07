'use client'

import { Layers } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { SpaceToolbarContext } from '../types'

/** The universal "Group by" pill used by default/missions/contacts/IG/artifact toolbars. */
export function GroupByButton({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    isIgResearchView,
    isMissionsView,
    isContactsView,
    isArtifactView,
    isMediaView,
    igGroupByLabel,
    missionsGroupByLabel,
    contactsGroupByLabel,
    mediaGroupByLabel,
    artifactGroupByLabel,
    groupByField,
    groupByBtnRef,
    setGroupByOpen,
  } = ctx

  const activeLabel = isIgResearchView
    ? igGroupByLabel
    : isMissionsView
      ? missionsGroupByLabel
      : isContactsView
        ? contactsGroupByLabel
        : isMediaView
          ? mediaGroupByLabel
          : isArtifactView
            ? artifactGroupByLabel
            : (groupByField?.name ?? null)

  const display = activeLabel ?? 'Group by'

  return (
    <Tooltip label="Group by" side="bottom">
      <span ref={groupByBtnRef} className="inline-flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => setGroupByOpen((o) => !o)}
          className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
            activeLabel
              ? 'badge-glass-purple'
              : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
          }`}
        >
          <Layers className="h-3 w-3" />
          {display}
        </button>
      </span>
    </Tooltip>
  )
}
