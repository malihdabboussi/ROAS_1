'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Album, ChevronRight, CircleDot, Layers, SlidersHorizontal, X } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { cn } from '@/lib/utils/cn'
import { CONTACTS_GROUP_BY_OPTIONS } from '../../../../lib/contacts-group-by-options'
import type { ViewDef } from '../../../../types/space-schema'
import { ContactsSortToolbarMenu } from '../../../contacts-sort-toolbar-menu'
import { CustomizeViewManagementSection } from '../../../customize-view-management-section'
import { GroupByToolbarPopover } from '../../../group-by-toolbar-popover'
import {
  CONTACT_FIELD_DEFS,
  CONTACTS_SORT_OPTIONS,
  getContactsConfig,
  patchContactsConfig,
} from './contacts-customize.config'

export function ContactsMainView({
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
  onOpenFields,
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
  onOpenFields: () => void
  isTeamSpace?: boolean
  canSaveForEveryone?: boolean
  hasViewOverride?: boolean
  onSaveForEveryone?: () => Promise<void>
  onResetToDefault?: () => Promise<void>
  onOpenSharingPermissions?: () => void
}) {
  const [contactsSortMenuOpen, setContactsSortMenuOpen] = useState(false)
  const contactsSortAnchorRef = useRef<HTMLButtonElement>(null)
  const [stageFilterOpen, setStageFilterOpen] = useState(false)
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false)
  const groupAnchorRef = useRef<HTMLButtonElement>(null)

  const cc = getContactsConfig(activeView)
  const sortLabel =
    CONTACTS_SORT_OPTIONS.find((o) => o.id === (cc.sort_by ?? 'created_at'))?.label ??
    'Created date'
  const contactsSortSummary = `${sortLabel} · ${(cc.sort_dir ?? 'desc') === 'desc' ? 'Z-A' : 'A-Z'}`
  const stageSummary =
    (cc.status_filter ?? 'all') === 'all'
      ? 'All'
      : (cc.status_filter ?? 'all') === 'lead'
        ? 'Lead'
        : 'Customer'
  const gbLabel = cc.group_by
    ? (CONTACTS_GROUP_BY_OPTIONS.find((o) => o.id === cc.group_by)?.label ?? cc.group_by)
    : 'None'

  return (
    <motion.div
      key="contacts-main"
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -30, opacity: 0 }}
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
        {/* Section 1 — contacts toggle */}
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="body-3 text-[var(--foreground)]">Show archived contacts</span>
            <Switch
              checked={cc.show_archived ?? false}
              onCheckedChange={(v) => patchContactsConfig(onViewPatch, cc, { show_archived: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="body-3 text-[var(--foreground)]">Show all org contacts</span>
            <Switch
              checked={(cc.scope ?? 'campaign') === 'all'}
              onCheckedChange={(v) =>
                patchContactsConfig(onViewPatch, cc, { scope: v ? 'all' : 'campaign' })
              }
            />
          </div>
        </div>

        {/* Section 2 — Fields / Group / Stage / Sort */}
        <div className="space-y-2.5 border-t border-[var(--border)] px-4 py-3">
          {/* Fields */}
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
                {CONTACT_FIELD_DEFS.length} fields
              </span>
              <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
            </div>
          </button>

          {/* Group */}
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
                {gbLabel}
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
            variant="contacts"
            groupableFields={[]}
          />

          {/* Stage filter */}
          <button
            type="button"
            onClick={() => setStageFilterOpen((o) => !o)}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <CircleDot className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Stage</span>
            </div>
            <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
              <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {stageSummary}
              </span>
              <ChevronRight
                className={cn(
                  'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                  stageFilterOpen && 'rotate-90',
                )}
              />
            </div>
          </button>
          {stageFilterOpen && (
            <div className="flex items-center gap-1 px-3 pb-1.5">
              {(['all', 'lead', 'customer'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => patchContactsConfig(onViewPatch, cc, { status_filter: s })}
                  className={cn(
                    'body-3 rounded-lg px-3 py-1.5 transition-colors',
                    (cc.status_filter ?? 'all') === s
                      ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                  )}
                >
                  {s === 'all' ? 'All' : s === 'lead' ? 'Lead' : 'Customer'}
                </button>
              ))}
            </div>
          )}

          {/* Sort */}
          <button
            ref={contactsSortAnchorRef}
            type="button"
            onClick={() => setContactsSortMenuOpen((o) => !o)}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Sort</span>
            </div>
            <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
              <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {contactsSortSummary}
              </span>
              <ChevronRight
                className={cn(
                  'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                  contactsSortMenuOpen && 'rotate-90',
                )}
              />
            </div>
          </button>
          <ContactsSortToolbarMenu
            open={contactsSortMenuOpen}
            onClose={() => setContactsSortMenuOpen(false)}
            anchorRef={contactsSortAnchorRef}
            onViewPatch={onViewPatch}
            activeView={activeView}
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
