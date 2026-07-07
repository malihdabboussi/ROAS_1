'use client'

import { useEffect } from 'react'
import { LucideIcon } from '@/components/ui/IconPicker'
import { cn } from '@/lib/utils/cn'
import { REPORTING_VIEW_TYPES, type ViewDef } from '../../types/space-schema'
import { VIEW_META } from '../view-type-tab-meta'

export type ViewTemplateCatalogRow = {
  type: ViewDef['type']
  label: string
  icon: string
  description: string
  newViewId?: string
}

export type ViewTemplateCatalogSection = {
  section: string
  items: ViewTemplateCatalogRow[]
}

function isEditorGatedViewType(type: ViewDef['type']): boolean {
  return type === 'contacts' || REPORTING_VIEW_TYPES.has(type)
}

function catalogSectionLabel(section: string): string {
  return section.replace(/^Artifacts — /, '')
}

export type AddViewTemplateParent = 'reporting' | 'artifact'

export interface AddViewTemplateModalProps {
  open: boolean
  parent: AddViewTemplateParent | null
  sections: ViewTemplateCatalogSection[]
  onClose: () => void
  onPick: (item: ViewTemplateCatalogRow) => void
  hasCampaign: boolean
  canAccessEditorViews: boolean
}

function CatalogPickButton({
  item,
  hasCampaign,
  canAccessEditorViews,
  onPick,
  onClose,
}: {
  item: ViewTemplateCatalogRow
  hasCampaign: boolean
  canAccessEditorViews: boolean
  onPick: (item: ViewTemplateCatalogRow) => void
  onClose: () => void
}) {
  const needsCampaign = REPORTING_VIEW_TYPES.has(item.type) && !hasCampaign
  const requiresEditor = isEditorGatedViewType(item.type) && !canAccessEditorViews
  const isDisabled = needsCampaign || requiresEditor
  const meta = VIEW_META[item.type] ?? VIEW_META.list!

  return (
    <button
      key={item.type}
      type="button"
      disabled={isDisabled}
      onClick={() => {
        if (isDisabled) return
        onPick(item)
        onClose()
      }}
      className={cn(
        'flex min-h-[6.5rem] flex-col items-start gap-3 rounded-xl border border-[var(--border)] p-4 text-left transition-colors',
        isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-[var(--color-hover-subtle)]',
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
          meta.glassClass,
        )}
      >
        <LucideIcon name={item.icon} className={cn('h-5 w-5', meta.textClass)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">{item.label}</span>
          {needsCampaign ? (
            <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Requires campaign
            </span>
          ) : null}
          {requiresEditor ? (
            <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Editor+
            </span>
          ) : null}
        </span>
        <span className="mt-1 line-clamp-2 block text-xs leading-snug text-[var(--color-muted-foreground)]">
          {item.description}
        </span>
      </span>
    </button>
  )
}

export function AddViewTemplateModal({
  open,
  parent,
  sections,
  onClose,
  onPick,
  hasCampaign,
  canAccessEditorViews,
}: AddViewTemplateModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !parent) return null

  const title = parent === 'reporting' ? 'Choose a Reporting view' : 'Choose an Artifact view'
  const subtitle =
    parent === 'reporting'
      ? 'Pick the type of report you want to track in this space.'
      : 'Pick the type of artifact you want to track in this space.'
  const showSectionHeaders = parent === 'artifact' && sections.length > 1

  return (
    <div
      className="fixed inset-0 z-[100002] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-modal-overlay"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-view-template-title"
        className="relative flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-xl"
      >
        <div className="border-b border-[var(--border)] px-6 py-5 text-center">
          <h2
            id="add-view-template-title"
            className="text-lg font-semibold text-[var(--foreground)]"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {sections.map((block) => (
            <div key={block.section} className="mb-6 last:mb-0">
              {showSectionHeaders ? (
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  {catalogSectionLabel(block.section)}
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {block.items.map((item) => (
                  <CatalogPickButton
                    key={item.type}
                    item={item}
                    hasCampaign={hasCampaign}
                    canAccessEditorViews={canAccessEditorViews}
                    onPick={onPick}
                    onClose={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-2 text-center text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
