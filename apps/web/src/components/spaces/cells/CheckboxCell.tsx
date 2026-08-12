'use client'

import type { BaseCellProps } from './cell-types'

export function CheckboxCell({ value, onChange, readonly }: BaseCellProps) {
  const checked = value === true || value === 'true'

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={readonly}
      onChange={(e) => {
        e.stopPropagation()
        onChange(e.target.checked)
      }}
      onClick={(e) => e.stopPropagation()}
      className="checkbox-glass-green shrink-0"
      aria-checked={checked}
    />
  )
}
