'use client'

import {
  ArrowDownUp,
  Check,
  Clapperboard,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import { AddColumnsButton } from '../_shared/AddColumnsButton'
import { GroupByButton } from '../_shared/GroupByButton'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { IgSortToolbarMenu } from '../../components/ig-sort-toolbar-menu'
import { ReportingTimeRangeSelector } from '../../components/reporting/shared/ReportingTimeRangeSelector'
import { cachedSocialProfileImageUrl } from '../../components/social-research/social-image-proxy'
import { TopicOutlierToolbarMenu } from '../../components/social-research/TopicOutlierToolbarMenu'
import { SpaceCustomizeButton } from '../../components/toolbar'
import {
  flattenAllSocialResearchAccounts,
  resolveAllSocialResearchAccounts,
} from '../../lib/all-social-research'
import { researchViewKey, useResearchNavStore } from '../../store/use-research-nav-store'
import { useResearchTopicToolbarBridgeStore } from '../../store/use-research-topic-toolbar-bridge'
import type { SpaceToolbarContext } from '../types'

const PLATFORM_DISPLAY_NAME = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X',
} as const

/** Toolbar for instagram_research and tiktok_research views. */
export function IgResearchToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeView,
    showGroupByInToolbar,
    showAddColumnsToolbar,
    igConfig,
    socialPlatform,
    socialResearchConfigKey,
    activeSchema,
    igDisplayMenuOpen,
    setIgDisplayMenuOpen,
    igDisplayBtnRef,
    igDisplayMenuRef,
    igSortMenuOpen,
    setIgSortMenuOpen,
    igSortBtnRef,
    igOutlierMenuOpen,
    setIgOutlierMenuOpen,
    igOutlierBtnRef,
    activeSpaceId,
    activeViewId,
    handleViewPatch,
    openCustomizeFromToolbar,
    schemaEditorOpen,
    closeCustomizePanel,
  } = ctx
  const platform = socialPlatform ?? 'instagram'
  const isAllSocial = activeView?.type === 'all_social_research'
  const configKey = isAllSocial
    ? 'all_social_research_config'
    : (socialResearchConfigKey ?? 'ig_research_config')
  const platformLabel = isAllSocial ? 'Research' : PLATFORM_DISPLAY_NAME[platform]
  const mergedAccounts = isAllSocial
    ? resolveAllSocialResearchAccounts(activeSchema, activeView!)
    : null
  const peoplePreview = isAllSocial
    ? flattenAllSocialResearchAccounts(mergedAccounts ?? {}).slice(0, 3)
    : igConfig.tracked_accounts.slice(0, 3).map((account) => ({ platform, account }))
  const trackedCount = isAllSocial
    ? flattenAllSocialResearchAccounts(mergedAccounts ?? {}).length
    : igConfig.tracked_accounts.length
  const viewKey =
    activeSpaceId && activeViewId ? researchViewKey(activeSpaceId, activeViewId) : null
  const topicSectionActive = useResearchNavStore((s) =>
    viewKey ? s.byViewKey[viewKey] === 'topic' : false,
  )
  const topicBridge = useResearchTopicToolbarBridgeStore((s) => s.bridge)
  const topicOutlierActive =
    topicSectionActive && (topicBridge?.hasResults ?? false) && (topicBridge?.minOutlier ?? 1) > 1

  return (
    <ToolbarShell ctx={ctx}>
      <div className="flex min-w-0 flex-nowrap items-center gap-1">
        {showGroupByInToolbar ? <GroupByButton ctx={ctx} /> : null}
        <div ref={igDisplayMenuRef} className="relative shrink-0">
          <Tooltip label="Layout" side="bottom">
            <span className="inline-flex shrink-0 items-center">
              <button
                ref={igDisplayBtnRef}
                type="button"
                onClick={() => {
                  setIgDisplayMenuOpen((o) => !o)
                  setIgSortMenuOpen(false)
                  setIgOutlierMenuOpen(false)
                }}
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                  igDisplayMenuOpen
                    ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                }`}
                aria-label="Layout"
              >
                {(igConfig.display_mode ?? 'grid') === 'list' ? (
                  <List className="h-3.5 w-3.5" />
                ) : (
                  <LayoutGrid className="h-3.5 w-3.5" />
                )}
              </button>
            </span>
          </Tooltip>
          {igDisplayMenuOpen ? (
            <div className="dropdown-menu-solid absolute left-0 top-full z-50 mt-1 w-40 rounded-xl py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  void handleViewPatch({
                    [configKey]: { ...igConfig, display_mode: 'grid' },
                  })
                  setIgDisplayMenuOpen(false)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="flex items-center gap-2 text-[var(--foreground)]">
                  <LayoutGrid className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                  Grid
                </span>
                {(igConfig.display_mode ?? 'grid') !== 'list' ? (
                  <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleViewPatch({
                    [configKey]: { ...igConfig, display_mode: 'list' },
                  })
                  setIgDisplayMenuOpen(false)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="flex items-center gap-2 text-[var(--foreground)]">
                  <List className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                  List
                </span>
                {(igConfig.display_mode ?? 'grid') === 'list' ? (
                  <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                ) : null}
              </button>
            </div>
          ) : null}
        </div>
        {showAddColumnsToolbar ? <AddColumnsButton ctx={ctx} /> : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
        <ReportingTimeRangeSelector
          variant="badge"
          config={{
            time_range: igConfig.time_range,
            custom_start: igConfig.custom_start,
            custom_end: igConfig.custom_end,
          }}
          onConfigPatch={(patch) =>
            void handleViewPatch({ [configKey]: { ...igConfig, ...patch } })
          }
        />
        {!topicSectionActive ? (
          <Tooltip label="People" side="bottom">
            <span className="inline-flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => {
                  setIgDisplayMenuOpen(false)
                  setIgSortMenuOpen(false)
                  setIgOutlierMenuOpen(false)
                  openCustomizeFromToolbar('people')
                }}
                className={
                  trackedCount > 0
                    ? 'badge-glass badge-glass-blue rounded-spacing-2 inline-flex shrink-0 cursor-pointer items-center border-0 px-2 py-1 shadow-none transition-opacity hover:opacity-90'
                    : 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                }
                aria-label="People"
              >
                {trackedCount > 0 ? (
                  <span className="flex -space-x-1.5">
                    {peoplePreview.map(({ platform: p, account: acct }) => {
                      const avatarUrl = cachedSocialProfileImageUrl(p, acct)
                      return avatarUrl ? (
                        <img
                          key={`${p}:${acct.handle}`}
                          src={avatarUrl}
                          alt={acct.handle}
                          className="h-4 w-4 rounded-full object-cover ring-1 ring-[var(--background)]"
                        />
                      ) : (
                        <span
                          key={`${p}:${acct.handle}`}
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[7px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--background)]"
                        >
                          {acct.handle.slice(0, 1).toUpperCase()}
                        </span>
                      )
                    })}
                  </span>
                ) : (
                  <Users className="h-3.5 w-3.5" />
                )}
              </button>
            </span>
          </Tooltip>
        ) : null}
        <Tooltip label="Format" side="bottom">
          <span className="inline-flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => {
                setIgDisplayMenuOpen(false)
                setIgSortMenuOpen(false)
                setIgOutlierMenuOpen(false)
                openCustomizeFromToolbar('ig_format')
              }}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
              aria-label="Format"
            >
              <Clapperboard className="h-3.5 w-3.5" />
            </button>
          </span>
        </Tooltip>
        {topicSectionActive ? (
          <div className="relative shrink-0">
            <Tooltip label="Outlier" side="bottom">
              <span className="inline-flex shrink-0 items-center">
                <button
                  ref={igOutlierBtnRef}
                  type="button"
                  onClick={() => {
                    setIgOutlierMenuOpen((o) => !o)
                    setIgDisplayMenuOpen(false)
                    setIgSortMenuOpen(false)
                  }}
                  disabled={!topicBridge?.hasResults}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    igOutlierMenuOpen || topicOutlierActive
                      ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                  }`}
                  aria-label="Outlier"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                </button>
              </span>
            </Tooltip>
            <TopicOutlierToolbarMenu
              open={igOutlierMenuOpen}
              onClose={() => setIgOutlierMenuOpen(false)}
              anchorRef={igOutlierBtnRef}
            />
          </div>
        ) : null}
        <div className="relative shrink-0">
          <Tooltip label="Sort" side="bottom">
            <span className="inline-flex shrink-0 items-center">
              <button
                ref={igSortBtnRef}
                type="button"
                onClick={() => {
                  setIgSortMenuOpen((o) => !o)
                  setIgDisplayMenuOpen(false)
                  setIgOutlierMenuOpen(false)
                }}
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                  igSortMenuOpen
                    ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                }`}
                aria-label="Sort"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
              </button>
            </span>
          </Tooltip>
        </div>
        {activeView ? (
          <IgSortToolbarMenu
            open={igSortMenuOpen}
            onClose={() => setIgSortMenuOpen(false)}
            anchorRef={igSortBtnRef}
            onViewPatch={handleViewPatch}
            activeView={activeView}
            platform={platform}
            topicMode={topicSectionActive}
          />
        ) : null}
        {topicSectionActive && topicBridge?.canRefreshSaved ? (
          <Tooltip label="Refresh search" side="bottom">
            <span className="inline-flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => topicBridge.refreshSavedSearch()}
                disabled={topicBridge.refreshingSaved}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Refresh search"
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', topicBridge.refreshingSaved && 'animate-spin')}
                />
              </button>
            </span>
          </Tooltip>
        ) : null}
        <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <SpaceCustomizeButton
            schemaEditorOpen={schemaEditorOpen}
            closeCustomizePanel={closeCustomizePanel}
            openCustomizeFromToolbar={openCustomizeFromToolbar}
          />
          <Tooltip
            label={isAllSocial ? 'Add account' : `Add ${platformLabel} account`}
            side="bottom"
          >
            <span className="inline-flex">
              <button
                type="button"
                onClick={() => openCustomizeFromToolbar('people')}
                className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90"
                aria-label={isAllSocial ? 'Add account' : `Add ${platformLabel} account`}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Account
              </button>
            </span>
          </Tooltip>
        </div>
      </div>
    </ToolbarShell>
  )
}
