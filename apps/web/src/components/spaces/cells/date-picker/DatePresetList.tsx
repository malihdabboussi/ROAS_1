'use client'

import { ChevronRight } from 'lucide-react'
import type { FieldDef, RecurrenceSpec } from '@/lib/spaces'
import type { DueDatePreset, DueDatePresetKey } from '@/lib/spaces/date-presets'
import { RecurrencePanel } from './RecurrencePanel'

type LeftMode = 'presets' | 'recurrence'

interface Props {
  leftMode: LeftMode
  presets: Array<DueDatePreset & { rightLabel?: string }>
  onPresetSelect: (key: DueDatePresetKey) => void
  onOpenRecurring: () => void
  onBackFromRecurring: () => void
  recurrenceInitial: RecurrenceSpec
  onSaveRecurrence: (value: RecurrenceSpec) => void
  statusField?: FieldDef
  onEditStatuses?: () => void
  onRecurrenceDraftChange?: (draft: RecurrenceSpec) => void
}

export function DatePresetList({
  leftMode,
  presets,
  onPresetSelect,
  onOpenRecurring,
  onBackFromRecurring,
  recurrenceInitial,
  onSaveRecurrence,
  statusField,
  onEditStatuses,
  onRecurrenceDraftChange,
}: Props) {
  return (
    <div className="border-border flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r">
      {leftMode === 'presets' ? (
        <>
          <div className="py-spacing-1 min-h-0 flex-1 overflow-y-auto">
            {presets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onPresetSelect(preset.key)}
                className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground mx-spacing-1 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-[calc(100%-var(--spacing-2))] items-center justify-between text-left transition-colors"
              >
                <span className="text-foreground font-medium">{preset.label}</span>
                {preset.rightLabel && (
                  <span className="typo-caption text-muted-foreground">{preset.rightLabel}</span>
                )}
              </button>
            ))}
          </div>

          <div className="border-border p-spacing-1 shrink-0 border-t">
            <button
              type="button"
              onClick={onOpenRecurring}
              className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1-5 flex w-full items-center justify-between text-left transition-colors"
            >
              <span className="text-foreground font-medium">Set Recurring</span>
              <ChevronRight className="icon-sm text-muted-foreground shrink-0" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RecurrencePanel
            variant="embedded"
            initialValue={recurrenceInitial}
            onCancel={onBackFromRecurring}
            onSave={onSaveRecurrence}
            statusField={statusField}
            onEditStatuses={onEditStatuses}
            onDraftChange={onRecurrenceDraftChange}
          />
        </div>
      )}
    </div>
  )
}
