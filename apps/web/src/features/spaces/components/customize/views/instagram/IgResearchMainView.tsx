'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Album,
  ArrowDownWideNarrow,
  Calendar,
  ChevronRight,
  Clapperboard,
  Layers,
  Users,
  X,
} from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useWorkspaceSettingsModal } from '@/features/settings/contexts/WorkspaceSettingsModalContext'
import { cn } from '@/lib/utils/cn'
import {
  activePlatformFilters,
  countAllSocialResearchAccounts,
  PLATFORM_LABELS,
  resolveAllSocialResearchAccounts,
} from '../../../../lib/all-social-research'
import {
  ALL_SOCIAL_RESEARCH_GROUP_BY_OPTIONS,
  IG_RESEARCH_GROUP_BY_OPTIONS,
} from '../../../../lib/ig-research-group-by'
import { resolveIgListVisibleColumns } from '../../../../lib/ig-research-list-columns'
import { getIgMediaToggles } from '../../../../lib/ig-research-media-toggles'
import {
  getConnectedSocialHandle,
  isSocialPlatformConnected,
  parseSocialHandle,
} from '../../../../services/social-research.service'
import {
  SOCIAL_PLATFORMS,
  SOCIAL_RESEARCH_LIST_COLUMN_IDS,
  type AllSocialResearchConfig,
  type SocialPlatform,
  type SpaceSchema,
  type ViewDef,
} from '../../../../types/space-schema'
import { CustomizeViewManagementSection } from '../../../customize-view-management-section'
import { GroupByToolbarPopover } from '../../../group-by-toolbar-popover'
import { IgSortToolbarMenu } from '../../../ig-sort-toolbar-menu'
import { REPORTING_DATE_RANGE_PRESETS } from '../../../reporting/shared/view-date-range-subview'
import { patchAllSocialConfig } from '../all-social-research/all-social-research-customize.helpers'
import { getSocialConfig, patchSocialConfig } from './instagram-customize.helpers'

const PLATFORM_DISPLAY_NAME: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X',
}

export function IgResearchMainView({
  activeView,
  platform = 'instagram',
  viewIconName,
  viewIconColor,
  nameDraft,
  setNameDraft,
  onViewPatch,
  onViewPinToStart,
  canDeleteView,
  onDeleteView,
  onClose,
  settingsPanelOpen,
  onAddAccount,
  onOpenFields,
  onOpenFormat,
  onOpenDateRange,
  onOpenPeople,
  isTeamSpace = false,
  canSaveForEveryone = false,
  hasViewOverride = false,
  onSaveForEveryone,
  onResetToDefault,
  onOpenSharingPermissions,
  activeSchema,
}: {
  activeView: ViewDef
  platform?: SocialPlatform
  viewIconName: string
  viewIconColor: { textColor: string }
  nameDraft: string
  setNameDraft: (v: string) => void
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onViewPinToStart: (pinned: boolean) => Promise<void>
  canDeleteView: boolean
  onDeleteView: () => Promise<void>
  onClose: () => void
  settingsPanelOpen: boolean
  onAddAccount?: (handle: string) => Promise<void>
  onOpenFields: () => void
  onOpenFormat: () => void
  onOpenDateRange: () => void
  onOpenPeople: () => void
  isTeamSpace?: boolean
  canSaveForEveryone?: boolean
  hasViewOverride?: boolean
  onSaveForEveryone?: () => Promise<void>
  onResetToDefault?: () => Promise<void>
  onOpenSharingPermissions?: () => void
  activeSchema?: SpaceSchema
}) {
  const isAllPlatforms = activeView.type === 'all_social_research'
  const platformLabel = isAllPlatforms ? 'All Research' : PLATFORM_DISPLAY_NAME[platform]
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false)
  const groupAnchorRef = useRef<HTMLButtonElement>(null)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortAnchorRef = useRef<HTMLButtonElement>(null)

  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [igConnected, setIgConnected] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    if (!settingsPanelOpen) return
    let cancelled = false
    void isSocialPlatformConnected(platform).then((connected) => {
      if (!cancelled) setIgConnected(connected)
    })
    return () => {
      cancelled = true
    }
  }, [settingsPanelOpen, platform])

  const ic = getSocialConfig(activeView, platform)

  const mergedAccounts = useMemo(() => {
    if (!isAllPlatforms || !activeSchema) return null
    return resolveAllSocialResearchAccounts(activeSchema, activeView)
  }, [activeSchema, activeView, isAllPlatforms])

  const trackedCount = isAllPlatforms
    ? countAllSocialResearchAccounts(mergedAccounts ?? {})
    : ic.tracked_accounts.length

  const groupByOptions = isAllPlatforms
    ? ALL_SOCIAL_RESEARCH_GROUP_BY_OPTIONS
    : IG_RESEARCH_GROUP_BY_OPTIONS

  const groupByLabel = ic.group_by
    ? (groupByOptions.find((o) => o.id === ic.group_by)?.label ?? ic.group_by)
    : 'None'

  const sortFieldLabel =
    ic.sort_by === 'play_count' ? 'Views' : ic.sort_by === 'taken_at' ? 'Date' : 'Outlier'
  const sortSummary = `${sortFieldLabel} · ${(ic.sort_dir ?? 'desc') === 'desc' ? 'Z-A' : 'A-Z'}`

  const mt = getIgMediaToggles(ic, platform)
  const formatSummary = (() => {
    if (platform === 'youtube') {
      const parts: string[] = []
      if (mt.youtubeVideos) parts.push('Videos')
      if (mt.youtubeShorts) parts.push('Shorts')
      return parts.length ? parts.join(' · ') : 'None'
    }
    if (platform === 'twitter') {
      const parts: string[] = []
      if (mt.xTweets) parts.push('Tweets')
      if (mt.xVideos) parts.push('Videos')
      return parts.length ? parts.join(' · ') : 'None'
    }
    const parts: string[] = []
    if (mt.reels) parts.push(platform === 'tiktok' ? 'Videos' : 'Reels')
    if (mt.images) parts.push(platform === 'tiktok' ? 'Photos' : 'Images')
    if (platform === 'tiktok' && mt.slideshows) parts.push('Slideshows')
    return parts.length ? parts.join(' · ') : 'None'
  })()

  const listFieldsSummary = useMemo(() => {
    const n = resolveIgListVisibleColumns(ic).length
    return `${n}/${SOCIAL_RESEARCH_LIST_COLUMN_IDS.length}`
  }, [ic.list_visible_columns])

  const igDateRangeSummary = useMemo(() => {
    if (ic.custom_start || ic.custom_end) {
      const fmt = (v: string | undefined) =>
        v
          ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '—'
      return `${fmt(ic.custom_start)} → ${fmt(ic.custom_end)}`
    }
    return (
      REPORTING_DATE_RANGE_PRESETS.find((p) => p.key === (ic.time_range ?? '30d'))?.label ??
      'Last 30 days'
    )
  }, [ic.custom_start, ic.custom_end, ic.time_range])

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconPicker
            className="z-10 shrink-0"
            value={viewIconName}
            color={activeView.icon_color}
            size="sm"
            onChange={(name) => void onViewPatch({ icon: name })}
            onColorChange={(colorId: IconColorId) => void onViewPatch({ icon_color: colorId })}
            customTrigger={
              <LucideIcon name={viewIconName} className={`h-4 w-4 ${viewIconColor.textColor}`} />
            }
          />
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim()
              if (!trimmed) {
                setNameDraft(activeView.name)
                return
              }
              if (trimmed !== activeView.name) void onViewPatch({ name: trimmed })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            className="body-3 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] px-2 py-1 font-semibold text-[var(--foreground)] outline-none focus:border-[var(--border)]"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isAllPlatforms ? (
          <div className="space-y-2 border-b border-[var(--border)] px-4 py-3">
            <span className="body-3 font-semibold text-[var(--foreground)]">Platforms</span>
            {SOCIAL_PLATFORMS.map((p) => {
              const enabled = activePlatformFilters(ic).includes(p)
              return (
                <div key={p} className="flex items-center justify-between gap-2">
                  <span className="body-3 text-[var(--foreground)]">{PLATFORM_LABELS[p]}</span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => {
                      const current = activePlatformFilters(ic)
                      const next = v
                        ? [...new Set([...current, p])]
                        : current.filter((x) => x !== p)
                      patchAllSocialConfig(onViewPatch, ic as AllSocialResearchConfig, {
                        platform_filters: next.length ? next : [...SOCIAL_PLATFORMS],
                      })
                    }}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="body-3 text-[var(--foreground)]">
                Show my {platformLabel} account
              </span>
              {igConnected === undefined ? (
                <VibeyLoadingOrb size="sm" state="processing" />
              ) : !igConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    openWorkspaceSettings('integrations')
                  }}
                  className="body-3 shrink-0 rounded-lg border border-[var(--color-border)] px-2.5 py-1 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  Connect
                </button>
              ) : (
                <Switch
                  checked={ic.show_connected_ig_in_grid !== false}
                  onCheckedChange={async (v) => {
                    patchSocialConfig(
                      onViewPatch,
                      ic,
                      { show_connected_ig_in_grid: v },
                      platform,
                      activeView,
                    )
                    if (v && onAddAccount) {
                      const raw = await getConnectedSocialHandle(platform)
                      if (!raw) return
                      const handle = parseSocialHandle(platform, raw).toLowerCase()
                      const alreadyTracked = ic.tracked_accounts.some(
                        (a) => a.handle.toLowerCase() === handle,
                      )
                      if (!alreadyTracked) {
                        await onAddAccount(handle)
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Section 2 — Fields / Group / People / … */}
        <div className="space-y-2.5 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onOpenFields}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex items-center gap-1.5">
              <Album className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Fields</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {listFieldsSummary}
              </span>
              <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
            </div>
          </button>

          <button
            ref={groupAnchorRef}
            type="button"
            onClick={() => setGroupPopoverOpen((o) => !o)}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Group</span>
            </div>
            <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
              <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {groupByLabel}
              </span>
              <ChevronRight
                className={cn(
                  'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                  groupPopoverOpen && 'rotate-90',
                )}
              />
            </div>
          </button>
          <GroupByToolbarPopover
            open={groupPopoverOpen}
            onClose={() => setGroupPopoverOpen(false)}
            anchorRef={groupAnchorRef}
            onViewPatch={onViewPatch}
            activeView={activeView}
            variant="ig"
            socialPlatform={platform}
            groupableFields={[]}
          />

          <button
            type="button"
            onClick={onOpenPeople}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">People</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {trackedCount} tracked
              </span>
              <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenFormat}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex items-center gap-1.5">
              <Clapperboard className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Format</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {formatSummary}
              </span>
              <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenDateRange}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Data range</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {igDateRangeSummary}
              </span>
              <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
            </div>
          </button>

          <button
            ref={sortAnchorRef}
            type="button"
            onClick={() => setSortMenuOpen((o) => !o)}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <ArrowDownWideNarrow className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Sort</span>
            </div>
            <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
              <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {sortSummary}
              </span>
              <ChevronRight
                className={cn(
                  'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                  sortMenuOpen && 'rotate-90',
                )}
              />
            </div>
          </button>
          <IgSortToolbarMenu
            open={sortMenuOpen}
            onClose={() => setSortMenuOpen(false)}
            anchorRef={sortAnchorRef}
            onViewPatch={onViewPatch}
            activeView={activeView}
            platform={platform}
          />
        </div>

        <CustomizeViewManagementSection
          activeView={activeView}
          onViewPatch={onViewPatch}
          onViewPinToStart={onViewPinToStart}
          canDeleteView={canDeleteView}
          onDeleteView={onDeleteView}
          isTeamSpace={isTeamSpace}
          canSaveForEveryone={canSaveForEveryone}
          hasViewOverride={hasViewOverride}
          onSaveForEveryone={onSaveForEveryone}
          onResetToDefault={onResetToDefault}
          onSharingPermissions={onOpenSharingPermissions}
        />
      </div>
    </motion.div>
  )
}
