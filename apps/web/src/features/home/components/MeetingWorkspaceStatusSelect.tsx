'use client'

import { SelectCell } from '@/components/ui/forms/SelectCell'
import { OptionDot } from '@/components/ui/status/OptionBadge'
import type { FieldDef } from '@/lib/spaces/space-schema-types'

export function MeetingWorkspaceStatusSelect({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: string | null | undefined
  onChange: (next: string) => void
}) {
  const selected = field.options?.find((option) => option.id === value) ?? null
  return (
    <div className="button-compact button-glass-neutral inline-flex items-center">
      <SelectCell
        field={field}
        value={value ?? ''}
        onChange={(next) => {
          if (typeof next === 'string' && next) onChange(next)
        }}
        customTrigger={
          <span className="gap-spacing-1 inline-flex items-center">
            <OptionDot color={selected?.color} size="sm" />
            <span className="body-3">{selected?.label ?? field.name}</span>
          </span>
        }
        triggerInline
      />
    </div>
  )
}
