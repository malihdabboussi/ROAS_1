'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Layers, X } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import {
  activeArtifactTypeFilters,
  ALL_ARTIFACT_KIND_TYPES,
  ALL_ARTIFACTS_GROUP_BY_OPTIONS,
  ARTIFACT_KIND_ICONS,
  ARTIFACT_KIND_LABELS,
} from '../../../../lib/all-artifacts'
import type { ArtifactViewType, ViewDef } from '../../../../types/space-schema'
import { CustomizeViewManagementSection } from '../../../customize-view-management-section'
import { GroupByToolbarPopover } from '../../../group-by-toolbar-popover'
import {
  getAllArtifactsCustomizeConfig,
  patchAllArtifactsConfig,
} from './all-artifacts-customize.helpers'

export function AllArtifactsMainView({
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
}) {
  const groupAnchorRef = useRef<HTMLButtonElement>(null)
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false)
  const config = getAllArtifactsCustomizeConfig(activeView)

  const groupByLabel = config.group_by
    ? (ALL_ARTIFACTS_GROUP_BY_OPTIONS.find((o) => o.id === config.group_by)?.label ??
      config.group_by)
    : 'None'

  const enabledKinds = useMemo(() => activeArtifactTypeFilters(config), [config])

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
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
        <div className="space-y-2 border-b border-[var(--border)] px-4 py-3">
          <span className="body-3 font-semibold text-[var(--foreground)]">Artifact types</span>
          {ALL_ARTIFACT_KIND_TYPES.map((kind) => {
            const enabled = enabledKinds.includes(kind)
            return (
              <div key={kind} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <LucideIcon
                    name={ARTIFACT_KIND_ICONS[kind]}
                    className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]"
                  />
                  <span className="body-3 text-[var(--foreground)]">
                    {ARTIFACT_KIND_LABELS[kind]}
                  </span>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => {
                    const current = activeArtifactTypeFilters(config)
                    const next: ArtifactViewType[] = v
                      ? [...new Set([...current, kind])]
                      : current.filter((x) => x !== kind)
                    patchAllArtifactsConfig(onViewPatch, config, {
                      artifact_type_filters: next.length ? next : [...ALL_ARTIFACT_KIND_TYPES],
                    })
                  }}
                />
              </div>
            )
          })}
        </div>

        <div className="space-y-2.5 border-b border-[var(--border)] px-4 py-3">
          <button
            type="button"
            ref={groupAnchorRef}
            onClick={() => setGroupPopoverOpen((o) => !o)}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Group by</span>
            </div>
            <span className="text-[10px] text-[var(--color-muted-foreground)]">{groupByLabel}</span>
          </button>
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

      <GroupByToolbarPopover
        open={groupPopoverOpen}
        onClose={() => setGroupPopoverOpen(false)}
        anchorRef={groupAnchorRef}
        onViewPatch={onViewPatch}
        activeView={activeView}
        variant="all_artifacts"
        groupableFields={[]}
      />
    </motion.div>
  )
}
