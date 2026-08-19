'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  Copy,
  FolderInput,
  Globe,
  Pin,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  X,
} from 'lucide-react'
import {
  MoveCopySubmenu,
  MoveCopySubmenuExclusiveGroup,
  moveCopyTriggerCustomize,
} from '@/components/menus/MoveCopySubmenu'
import Switch from '@/components/ui/forms/switch'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { useOrgStore } from '@/lib/org/org-context-store'
import { VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { cn } from '@/lib/utils/cn'
import {
  spaceCustomizeDeleteModalTitle,
  SPACES_CUSTOMIZE_VIEW_LABELS,
} from '../config/spaces-customize-view.config'
import { useSpacePermission } from '../hooks/use-space-permission'
import { useSpacesStore } from '../store/use-spaces-store'
import type { ViewDef } from '../types/space-schema'

export function CustomizeViewManagementSection({
  activeView,
  onViewPatch,
  onViewPinToStart,
  canDeleteView,
  onDeleteView,
  isTeamSpace = false,
  canSaveForEveryone = false,
  hasViewOverride = false,
  onSaveForEveryone,
  onResetToDefault,
  onSharingPermissions,
}: {
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onViewPinToStart: (pinned: boolean) => Promise<void>
  canDeleteView: boolean
  onDeleteView: () => Promise<void>
  isTeamSpace?: boolean
  canSaveForEveryone?: boolean
  hasViewOverride?: boolean
  onSaveForEveryone?: () => Promise<void>
  onResetToDefault?: () => Promise<void>
  onSharingPermissions?: () => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const memberships = useOrgStore((s) => s.memberships)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const activeSpace = useSpacesStore((s) => s.spaces.find((space) => space.id === activeSpaceId))
  const perm = useSpacePermission(activeSpace ?? null)

  useEffect(() => {
    let cancelled = false
    fetchCampaigns()
      .then((next) => {
        if (!cancelled) setCampaigns(next)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sourceOrgId =
    activeSpace && activeSpace.org_id !== activeSpace.user_id ? activeSpace.org_id : null
  const viewEntityId = activeSpace ? `${activeSpace.id}:${activeView.id}` : null

  return (
    <>
      <div className="space-y-3 border-t border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Save className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span className="body-3 text-[var(--foreground)]">
              {SPACES_CUSTOMIZE_VIEW_LABELS.AUTOSAVE_FOR_ME}
            </span>
          </div>
          <Switch
            checked={activeView.autosave_for_me !== false}
            onCheckedChange={(v) => void onViewPatch({ autosave_for_me: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Pin className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span className="body-3 text-[var(--foreground)]">
              {SPACES_CUSTOMIZE_VIEW_LABELS.PIN_VIEW}
            </span>
          </div>
          <Switch
            checked={activeView.pinned_to_start ?? false}
            onCheckedChange={(v) => void onViewPinToStart(v)}
          />
        </div>
        {isTeamSpace && canSaveForEveryone ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span className="body-3 text-[var(--foreground)]">
                {SPACES_CUSTOMIZE_VIEW_LABELS.SAVE_FOR_EVERYONE}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void onSaveForEveryone?.()}
              className="body-3 text-[var(--color-primary)] transition-colors hover:opacity-80"
            >
              Save
            </button>
          </div>
        ) : null}
        {isTeamSpace && hasViewOverride ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span className="body-3 text-[var(--foreground)]">
                {SPACES_CUSTOMIZE_VIEW_LABELS.RESET_TO_DEFAULT}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void onResetToDefault?.()}
              className="body-3 text-[var(--color-primary)] transition-colors hover:opacity-80"
            >
              Reset
            </button>
          </div>
        ) : null}
      </div>

      {activeSpace && viewEntityId ? (
        <div className="space-y-3 border-t border-[var(--border)] px-4 py-3">
          <MoveCopySubmenuExclusiveGroup>
            <MoveCopySubmenu
              mode="move"
              label="Move to"
              icon={
                <FolderInput className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              }
              entityType="view"
              entityId={viewEntityId}
              entityName={activeView.name}
              sourceOrgId={sourceOrgId}
              sourceCampaignId={activeSpace.campaign_id}
              currentCampaigns={campaigns}
              memberships={memberships}
              onCloseMenus={() => {}}
              className={moveCopyTriggerCustomize}
            />
            <MoveCopySubmenu
              mode="copy"
              label="Copy to"
              icon={<Copy className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />}
              entityType="view"
              entityId={viewEntityId}
              entityName={activeView.name}
              sourceOrgId={sourceOrgId}
              sourceCampaignId={activeSpace.campaign_id}
              currentCampaigns={campaigns}
              memberships={memberships}
              onCloseMenus={() => {}}
              className={moveCopyTriggerCustomize}
            />
          </MoveCopySubmenuExclusiveGroup>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-[var(--border)] px-4 py-3">
        {onSharingPermissions && perm.canAdmin ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSharingPermissions()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSharingPermissions()
            }}
            className="flex cursor-pointer items-center gap-1.5 transition-colors hover:opacity-80"
          >
            <Shield className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
            <span className="body-3 font-semibold text-[var(--foreground)]">
              {SPACES_CUSTOMIZE_VIEW_LABELS.SHARING_PERMISSIONS}
            </span>
          </div>
        ) : null}
        <div
          role="button"
          tabIndex={canDeleteView ? 0 : -1}
          onClick={() => {
            if (canDeleteView) setDeleteOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canDeleteView) setDeleteOpen(true)
          }}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 transition-colors',
            canDeleteView ? 'hover:opacity-80' : 'cursor-not-allowed opacity-40',
          )}
        >
          <Trash2 className="text-destructive h-3.5 w-3.5" />
          <span className="body-3 text-destructive font-semibold">
            {SPACES_CUSTOMIZE_VIEW_LABELS.DELETE_VIEW}
          </span>
        </div>
      </div>

      {deleteOpen &&
        createPortal(
          <div {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}>
            <div
              className="z-modal-backdrop bg-modal-overlay fixed inset-0"
              onClick={() => setDeleteOpen(false)}
            />
            <div className="z-modal-content fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6">
              <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  className="btn-icon-bare btn-close-absolute"
                >
                  <span className="sr-only">{SPACES_CUSTOMIZE_VIEW_LABELS.A11Y_CLOSE}</span>
                  <X className="h-4 w-4" />
                </button>
                <div className="px-spacing-6 pt-spacing-6 pb-spacing-4 flex flex-col items-center text-center">
                  <div className="bg-destructive/10 mb-spacing-3 flex h-12 w-12 items-center justify-center rounded-full">
                    <AlertCircle className="text-destructive h-6 w-6" />
                  </div>
                  <h2 className="title-h6 text-foreground">
                    {spaceCustomizeDeleteModalTitle(activeView.name)}
                  </h2>
                  <p className="body-3 text-muted-foreground mt-spacing-2">
                    {SPACES_CUSTOMIZE_VIEW_LABELS.MODAL_DELETE_BODY}
                  </p>
                </div>
                <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex border-t">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                  >
                    {SPACES_CUSTOMIZE_VIEW_LABELS.MODAL_CANCEL}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteOpen(false)
                      void onDeleteView()
                    }}
                    className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    <span className="relative z-10">
                      {SPACES_CUSTOMIZE_VIEW_LABELS.MODAL_DELETE_CONFIRM}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
