'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Filter, Layers, X } from 'lucide-react'
import { IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { fetchCampaignFunnels } from '@/lib/artifacts/funnel-preview-api'
import { cn } from '@/lib/utils/cn'
import { artifactGroupableFields } from '../../../../lib/artifact-view-config'
import type { ViewDef } from '../../../../types/space-schema'
import { CustomizeViewManagementSection } from '../../../customize-view-management-section'
import { GroupByToolbarPopover } from '../../../group-by-toolbar-popover'
import { FunnelSettingsSubView } from '../../funnels-customize/FunnelSettingsSubView'
import { FunnelsListSubView } from '../../funnels-customize/FunnelsListSubView'
import { ArtifactsCardFieldsSection } from './ArtifactsCardFieldsSection'

export function ArtifactsMainView({
  activeView,
  viewIconName,
  viewIconColor,
  nameDraft,
  setNameDraft,
  onViewPatch,
  onViewPinToStart,
  canDeleteView,
  onDeleteView,
  onClose,
  isTeamSpace = false,
  canSaveForEveryone = false,
  hasViewOverride = false,
  onSaveForEveryone,
  onResetToDefault,
  onOpenSharingPermissions,
  artifactCampaignId = null,
  onOpenAdsCardFields,
  onOpenSocialPostsCardFields,
  onOpenFunnelsCardFields,
  onOpenSequencesCardFields,
  onOpenPresentationsCardFields,
  onOpenAvatarsCardFields,
  onOpenFormsCardFields,
}: {
  activeView: ViewDef
  viewIconName: string
  viewIconColor: { textColor: string }
  nameDraft: string
  setNameDraft: (v: string) => void
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onViewPinToStart: (pinned: boolean) => Promise<void>
  canDeleteView: boolean
  onDeleteView: () => Promise<void>
  onClose: () => void
  isTeamSpace?: boolean
  canSaveForEveryone?: boolean
  hasViewOverride?: boolean
  onSaveForEveryone?: () => Promise<void>
  onResetToDefault?: () => Promise<void>
  onOpenSharingPermissions?: () => void
  artifactCampaignId?: string | null
  onOpenAdsCardFields?: () => void
  onOpenSocialPostsCardFields?: () => void
  onOpenFunnelsCardFields?: () => void
  onOpenSequencesCardFields?: () => void
  onOpenPresentationsCardFields?: () => void
  onOpenAvatarsCardFields?: () => void
  onOpenFormsCardFields?: () => void
}) {
  const [funnelNav, setFunnelNav] = useState<
    { t: 'main' } | { t: 'list' } | { t: 'settings'; funnelId: string }
  >({ t: 'main' })
  const [funnelRowCount, setFunnelRowCount] = useState<number | null>(null)
  const groupAnchorRef = useRef<HTMLButtonElement>(null)
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false)

  const groupableFields = useMemo(() => artifactGroupableFields(activeView.type), [activeView.type])
  const groupByField = useMemo(
    () =>
      activeView.group_by ? groupableFields.find((f) => f.id === activeView.group_by) : undefined,
    [activeView.group_by, groupableFields],
  )

  useEffect(() => {
    setFunnelNav({ t: 'main' })
  }, [activeView.id, activeView.type])

  useEffect(() => {
    if (activeView.type !== 'funnels' || !artifactCampaignId) {
      setFunnelRowCount(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchCampaignFunnels(artifactCampaignId)
        const n = list.filter((f) => f.funnel_type !== 'website').length
        if (!cancelled) setFunnelRowCount(n)
      } catch {
        if (!cancelled) setFunnelRowCount(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeView.type, artifactCampaignId])

  if (funnelNav.t === 'list' && artifactCampaignId) {
    return (
      <FunnelsListSubView
        campaignId={artifactCampaignId}
        onBack={() => setFunnelNav({ t: 'main' })}
        onOpenFunnel={(id) => setFunnelNav({ t: 'settings', funnelId: id })}
      />
    )
  }

  if (funnelNav.t === 'settings' && artifactCampaignId) {
    return (
      <FunnelSettingsSubView
        campaignId={artifactCampaignId}
        funnelId={funnelNav.funnelId}
        onBack={() => setFunnelNav({ t: 'list' })}
        onClose={onClose}
      />
    )
  }

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
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
            className="body-3 border-border bg-secondary text-foreground focus:border-border min-w-0 flex-1 rounded-md border px-2 py-1 font-semibold outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground shrink-0 rounded-md p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-border space-y-2.5 border-b px-4 py-3">
          <ArtifactsCardFieldsSection
            activeView={activeView}
            onOpenAdsCardFields={onOpenAdsCardFields}
            onOpenSocialPostsCardFields={onOpenSocialPostsCardFields}
            onOpenFunnelsCardFields={onOpenFunnelsCardFields}
            onOpenSequencesCardFields={onOpenSequencesCardFields}
            onOpenPresentationsCardFields={onOpenPresentationsCardFields}
            onOpenAvatarsCardFields={onOpenAvatarsCardFields}
            onOpenFormsCardFields={onOpenFormsCardFields}
          />

          {groupableFields.length > 0 ? (
            <>
              <button
                ref={groupAnchorRef}
                type="button"
                onClick={() => setGroupPopoverOpen((o) => !o)}
                className="flex w-full items-center justify-between transition-colors hover:opacity-80"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <Layers className="icon-sm text-muted-foreground shrink-0" />
                  <span className="body-3 text-foreground font-semibold">Group</span>
                </div>
                <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
                  <span className="typo-caption text-muted-foreground truncate">
                    {groupByField?.name ?? 'None'}
                  </span>
                  <ChevronRight
                    className={cn(
                      'icon-xs text-muted-foreground shrink-0 transition-transform duration-200',
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
                variant="space"
                groupableFields={groupableFields}
              />
            </>
          ) : null}

          {activeView.type === 'funnels' && artifactCampaignId ? (
            <button
              type="button"
              onClick={() => setFunnelNav({ t: 'list' })}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Filter className="icon-sm text-muted-foreground shrink-0" />
                <span className="body-3 text-foreground font-semibold">Funnels</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {funnelRowCount !== null ? (
                  <span className="typo-caption text-muted-foreground">
                    {funnelRowCount}
                  </span>
                ) : null}
                <ChevronRight className="icon-xs text-muted-foreground shrink-0" />
              </div>
            </button>
          ) : null}
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
