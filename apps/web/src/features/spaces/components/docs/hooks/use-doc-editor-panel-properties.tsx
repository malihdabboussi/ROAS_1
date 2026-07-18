'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { SpaceItem } from '../../../types'
import type { FieldDef, SelectOption, ViewDef } from '../../../types/space-schema'
import { isSpaceFieldVisibleInUi } from '../../../types/space-schema'
import { DocPropertiesSection } from '../properties/DocPropertiesSection'

type UseDocEditorPanelPropertiesArgs = {
  item: SpaceItem
  view?: ViewDef
  allFields?: FieldDef[]
  roster?: TeamRosterEntry[]
  currentUserId?: string | null
  docCustomData: Record<string, unknown>
  handleUpdateField: (patch: Partial<SpaceItem>) => void | Promise<void>
  onEditCategories?: () => void
  onEditStatuses?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
}

export function useDocEditorPanelProperties({
  item,
  view,
  allFields,
  roster,
  currentUserId,
  docCustomData,
  handleUpdateField,
  onEditCategories,
  onEditStatuses,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
}: UseDocEditorPanelPropertiesArgs) {
  const [addPropOpen, setAddPropOpen] = useState(false)

  const docHiddenFields = useMemo(
    () => new Set((docCustomData._doc_hidden_fields as string[] | undefined) ?? []),
    [docCustomData],
  )
  const docExtraFields = useMemo(
    () => (docCustomData._doc_extra_fields as string[] | undefined) ?? [],
    [docCustomData],
  )

  const visibleFieldIds = useMemo(() => {
    const viewDefault = view?.visible_fields ?? (allFields ?? []).map((f) => f.id)
    const merged = [...new Set([...viewDefault, ...docExtraFields])]
    return merged.filter((id) => !docHiddenFields.has(id))
  }, [view?.visible_fields, allFields, docExtraFields, docHiddenFields])

  const propsFields = useMemo(() => {
    const byId = new Map((allFields ?? []).map((f) => [f.id, f]))
    return visibleFieldIds
      .map((id) => byId.get(id))
      .filter((f): f is FieldDef => !!f && isSpaceFieldVisibleInUi(f) && f.id !== 'title')
  }, [visibleFieldIds, allFields])

  const addableFields = useMemo(() => {
    const visibleSet = new Set(visibleFieldIds)
    return (allFields ?? []).filter(
      (f) => isSpaceFieldVisibleInUi(f) && f.id !== 'title' && !visibleSet.has(f.id),
    )
  }, [visibleFieldIds, allFields])

  const statusFieldForCell = useMemo(
    () => (allFields ?? []).find((f) => f.id === 'status'),
    [allFields],
  )

  const handleHideField = useCallback(
    (fieldId: string) => {
      const next = [
        ...new Set([...((docCustomData._doc_hidden_fields as string[]) ?? []), fieldId]),
      ]
      void handleUpdateField({ custom_data: { _doc_hidden_fields: next } })
    },
    [docCustomData, handleUpdateField],
  )

  const handleAddField = useCallback(
    (fieldId: string) => {
      const currentExtra = (docCustomData._doc_extra_fields as string[] | undefined) ?? []
      const currentHidden = (docCustomData._doc_hidden_fields as string[] | undefined) ?? []
      const nextExtra = [...new Set([...currentExtra, fieldId])]
      const nextHidden = currentHidden.filter((id) => id !== fieldId)
      void handleUpdateField({
        custom_data: {
          _doc_extra_fields: nextExtra,
          _doc_hidden_fields: nextHidden,
        },
      })
      setAddPropOpen(false)
    },
    [docCustomData, handleUpdateField],
  )

  const hasDocProperties = propsFields.length > 0 || addableFields.length > 0
  const canShareItem = !item.id.startsWith('cdoc:') && !item.id.startsWith('mdel:')

  const renderPropertiesInner = useCallback(
    (singleColumn: boolean): ReactNode =>
      hasDocProperties ? (
        <DocPropertiesSection
          singleColumn={singleColumn}
          propsFields={propsFields}
          addableFields={addableFields}
          item={item}
          roster={roster ?? []}
          currentUserId={currentUserId ?? null}
          onUpdateField={handleUpdateField}
          onHideField={handleHideField}
          onEditStatuses={onEditStatuses}
          onEditCategories={onEditCategories}
          onCreateOption={onCreateOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          statusFieldForCell={statusFieldForCell}
          allFields={allFields}
          addPropOpen={addPropOpen}
          setAddPropOpen={setAddPropOpen}
          onAddField={handleAddField}
        />
      ) : null,
    [
      hasDocProperties,
      propsFields,
      addableFields,
      item,
      roster,
      currentUserId,
      handleUpdateField,
      handleHideField,
      onEditStatuses,
      onEditCategories,
      onCreateOption,
      onUpdateOption,
      onDeleteOption,
      onTagCustomSwatchesChange,
      statusFieldForCell,
      allFields,
      addPropOpen,
      handleAddField,
    ],
  )

  return {
    hasDocProperties,
    canShareItem,
    renderPropertiesInner,
  }
}
