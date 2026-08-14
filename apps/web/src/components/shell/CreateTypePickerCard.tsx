'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { CreateTypePickerCatalog, CreateTypePickerOption } from './shell-create-type-pickers'

export function CreateTypePickerCard({
  catalog,
  visuals,
  onSelect,
  onDismiss,
}: {
  catalog: CreateTypePickerCatalog
  visuals?: Record<string, ReactNode>
  onSelect: (option: CreateTypePickerOption) => void
  onDismiss: () => void
}) {
  return (
    <div className="surface-card border-border rounded-spacing-3 mb-spacing-3 overflow-hidden border">
      <div className="px-spacing-4 pt-spacing-4 pb-spacing-3 border-border flex items-start justify-between border-b">
        <div className="pr-spacing-4 min-w-0">
          <h2 className="title-h6 text-foreground">{catalog.title}</h2>
          <p className="body-3 text-muted-foreground mt-spacing-1">{catalog.intro}</p>
        </div>
        <button type="button" onClick={onDismiss} className="btn-icon-bare shrink-0" aria-label="Close">
          <X className="icon-sm" />
        </button>
      </div>
      <div className="px-spacing-4 py-spacing-4 gap-spacing-3 grid sm:grid-cols-2">
        {catalog.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option)}
            className="card-glass-interactive gap-spacing-3 p-spacing-4 flex flex-col text-left"
          >
            {visuals?.[option.id] ? (
              <div className="bg-muted rounded-spacing-2 flex items-center justify-center overflow-hidden">
                {visuals[option.id]}
              </div>
            ) : null}
            <div className="space-y-spacing-1">
              <p className="body-2 text-foreground font-semibold">{option.label}</p>
              <p className="body-3 text-muted-foreground">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
