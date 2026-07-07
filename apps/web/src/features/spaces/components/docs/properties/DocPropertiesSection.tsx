'use client'

import { useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { SpaceItem } from '../../../types'
import type { FieldDef, SelectOption } from '../../../types/space-schema'
import { FIELD_TYPE_ICON } from '../lib/field-type-icons'
import { DocPropertyRow } from './DocPropertyRow'

export function DocPropertiesSection({
  singleColumn,
  propsFields,
  addableFields,
  item,
  roster,
  currentUserId,
  onUpdateField,
  onHideField,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  statusFieldForCell,
  allFields,
  addPropOpen,
  setAddPropOpen,
  onAddField,
}: {
  singleColumn: boolean
  propsFields: FieldDef[]
  addableFields: FieldDef[]
  item: SpaceItem
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onUpdateField: (patch: Partial<SpaceItem>) => void
  onHideField: (fieldId: string) => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  statusFieldForCell?: FieldDef
  allFields?: FieldDef[]
  addPropOpen: boolean
  setAddPropOpen: (v: boolean | ((p: boolean) => boolean)) => void
  onAddField: (fieldId: string) => void
}) {
  const addPropBtnRef = useRef<HTMLButtonElement>(null)
  const addPropDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addPropOpen) return
    const onOutside = (e: MouseEvent) => {
      if (
        !addPropBtnRef.current?.contains(e.target as Node) &&
        !addPropDropdownRef.current?.contains(e.target as Node)
      )
        setAddPropOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [addPropOpen, setAddPropOpen])

  const hasDocProperties = propsFields.length > 0 || addableFields.length > 0
  if (!hasDocProperties) return null

  return (
    <>
      {propsFields.length > 0 && (
        <div
          className={singleColumn ? 'flex flex-col gap-0.5' : 'grid grid-cols-2 gap-x-2 gap-y-0.5'}
        >
          {propsFields.map((field) => (
            <DocPropertyRow
              key={field.id}
              field={field}
              item={item}
              roster={roster}
              currentUserId={currentUserId}
              onUpdate={(p) => void onUpdateField(p)}
              onHide={onHideField}
              onEditStatuses={onEditStatuses}
              onEditCategories={onEditCategories}
              onCreateOption={onCreateOption}
              onUpdateOption={onUpdateOption}
              onDeleteOption={onDeleteOption}
              onTagCustomSwatchesChange={onTagCustomSwatchesChange}
              statusField={statusFieldForCell}
              allFields={allFields}
            />
          ))}
        </div>
      )}

      {addableFields.length > 0 && (
        <div className="relative mt-1">
          <button
            ref={addPropBtnRef}
            type="button"
            onClick={() => setAddPropOpen((o) => !o)}
            className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <Plus className="h-3 w-3" />
            Add property
          </button>
          {addPropOpen && (
            <div
              ref={addPropDropdownRef}
              className="dropdown-menu-solid absolute left-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-xl py-1"
            >
              {addableFields.map((f) => {
                const Icon = FIELD_TYPE_ICON[f.type]
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onAddField(f.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                  >
                    {Icon && (
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                    )}
                    {f.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}
