'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { fetchForm, type Form } from '@/lib/forms/forms-api'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption, ViewDef } from '../../types/space-schema'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'
import { ListView } from '../ListView'

interface FormResponsesViewProps {
  view: ViewDef
  items: SpaceItem[]
  visibleFields: FieldDef[]
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  readOnly: boolean
  onUpdateItem: (itemId: string, payload: Partial<SpaceItem>) => Promise<void>
  onDeleteItem: (itemId: string) => void | Promise<void>
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
  onOpenDetail?: (item: SpaceItem) => void
  onViewChange: (patch: Partial<ViewDef>) => Promise<void>
  onCreateOption: (fieldId: string, option: SelectOption) => Promise<void>
  onUpdateOption: (
    fieldId: string,
    optionId: string,
    updates: Partial<SelectOption>,
  ) => Promise<void>
  onDeleteOption: (fieldId: string, optionId: string) => Promise<void>
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onAddField: () => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
}

export function FormResponsesView({
  view,
  items,
  visibleFields,
  allFields,
  roster,
  currentUserId,
  readOnly,
  onUpdateItem,
  onDeleteItem,
  onPushToAgent,
  onOpenDetail,
  onViewChange,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onAddField,
  onEditStatuses,
  onEditCategories,
}: FormResponsesViewProps) {
  const [form, setForm] = useState<Form | null>(null)
  const formId = view._form_id ?? null
  const createItem = useSpacesStore((state) => state.createItem)

  useEffect(() => {
    let cancelled = false
    if (!formId) {
      setForm(null)
      return
    }
    fetchForm(formId)
      .then((next) => {
        if (!cancelled) setForm(next)
      })
      .catch(() => {
        if (!cancelled) setForm(null)
      })
    return () => {
      cancelled = true
    }
  }, [formId])

  const responseItems = useMemo(
    () => (formId ? items.filter((item) => item.form_id === formId) : []),
    [formId, items],
  )

  if (!formId) {
    return (
      <div className="p-spacing-8 flex flex-1 items-center justify-center text-center">
        <p className="body-3 text-muted-foreground">This responses view is missing a form id.</p>
      </div>
    )
  }

  if (responseItems.length === 0) {
    return (
      <div className="gap-spacing-3 p-spacing-8 flex flex-1 flex-col items-center justify-center text-center">
        <Inbox className="text-muted-foreground/40 h-8 w-8" />
        <div className="space-y-spacing-1">
          <h3 className="title-h6 text-foreground">No responses yet</h3>
          <p className="body-3 text-muted-foreground max-w-sm">
            {form
              ? `Share ${form.name} to start collecting responses in this view.`
              : 'Share the form to start collecting responses in this view.'}
          </p>
        </div>
        {form?.published_url ? (
          <button
            type="button"
            className="button-compact button-glass-neutral"
            onClick={() => {
              void navigator.clipboard.writeText(form.published_url ?? '')
              toast.success('Form link copied')
            }}
          >
            <Copy className="icon-sm" />
            Copy form link
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <ListView
      items={responseItems}
      visibleFields={visibleFields}
      roster={roster}
      currentUserId={currentUserId}
      readOnly={readOnly}
      onUpdateItem={onUpdateItem}
      onDeleteItem={onDeleteItem}
      onPushToAgent={onPushToAgent}
      onOpenDetail={onOpenDetail}
      activeView={view}
      allFields={allFields}
      onViewChange={onViewChange}
      onCreateOption={onCreateOption}
      onUpdateOption={onUpdateOption}
      onDeleteOption={onDeleteOption}
      onTagCustomSwatchesChange={onTagCustomSwatchesChange}
      onAddItemInGroup={async (title, _groupFieldId, _groupKey, fieldExtras) => {
        await createItem(title, { ...(fieldExtras ?? {}), form_id: formId })
      }}
      quickAddOnSubmitItem={async (title, extras) => {
        await createItem(title, { ...extras, form_id: formId })
      }}
      onEditStatuses={onEditStatuses}
      onEditCategories={onEditCategories}
      onAddField={onAddField}
    />
  )
}
