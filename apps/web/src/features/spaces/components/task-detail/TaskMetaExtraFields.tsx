'use client'

import { Fragment } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'
import { SpaceCell } from '../cells/SpaceCell'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'
import { readFieldValue, toFieldPatch } from '../space-item-values'
import { CELL, TASK_META_GRID_STYLE } from './task-meta-fields-helpers'

interface TaskMetaExtraFieldsProps {
  expanded: boolean
  extraFields: FieldDef[]
  item: SpaceItem
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onToggleExtraFields: () => void
  onUpdateField: (patch: Partial<SpaceItem>) => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onPushToAgent?: (itemId: string, options?: MissionSendOptions) => Promise<void>
}

export function TaskMetaExtraFields({
  expanded,
  extraFields,
  item,
  allFields,
  roster,
  currentUserId,
  onToggleExtraFields,
  onUpdateField,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onPushToAgent,
}: TaskMetaExtraFieldsProps) {
  const hasExtras = extraFields.length > 0

  return (
    <>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid gap-x-3 gap-y-0.5 pt-1" style={TASK_META_GRID_STYLE}>
              {extraFields.map((field, idx) => {
                const val = readFieldValue(item, field.id)
                const isLast = idx === extraFields.length - 1
                const needsPadding = isLast && extraFields.length % 2 === 1

                return (
                  <Fragment key={field.id}>
                    <span className="body-2 flex items-center text-[var(--color-muted-foreground)]">
                      {field.name}
                    </span>
                    <div className="flex items-center">
                      <div className={CELL}>
                        <SpaceCell
                          field={field}
                          value={val}
                          roster={roster}
                          currentUserId={currentUserId}
                          onEditStatuses={onEditStatuses}
                          onEditCategories={onEditCategories}
                          onCreateOption={onCreateOption}
                          onUpdateOption={onUpdateOption}
                          onDeleteOption={onDeleteOption}
                          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                          spaceItem={item}
                          onItemPatch={(p) => onUpdateField(p)}
                          onPushToAgent={onPushToAgent}
                          allFields={allFields}
                          onChange={(next) => onUpdateField(toFieldPatch(item, field.id, next))}
                        />
                      </div>
                    </div>
                    {needsPadding && (
                      <>
                        <span />
                        <span />
                      </>
                    )}
                  </Fragment>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasExtras && (
        <div className="flex justify-center pt-1.5 opacity-0 transition-opacity group-hover/meta:opacity-100">
          <button
            type="button"
            onClick={onToggleExtraFields}
            className="body-3 flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-0.5 text-[var(--color-muted-foreground)] shadow-sm transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--color-foreground)]"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                {extraFields.length} more field{extraFields.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
    </>
  )
}
