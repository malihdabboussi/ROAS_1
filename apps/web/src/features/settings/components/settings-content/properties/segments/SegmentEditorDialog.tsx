'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { SegmentFilterBuilder } from '@/features/properties/components/segments/SegmentFilterBuilder'
import type { SegmentFilters } from '@/lib/properties/segments'

const segmentTextFieldCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]'

function isInsidePortaledDropdown(node: EventTarget | null | undefined): boolean {
  if (!(node instanceof Element)) return false
  return Boolean(
    node.closest('[data-reporting-time-dropdown]') ||
    node.closest('[data-segment-filter-dropdown]'),
  )
}

interface SegmentEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditing: boolean
  segmentName: string
  segmentDescription: string
  segmentFilters: SegmentFilters
  isSaving: boolean
  onSegmentNameChange: (value: string) => void
  onSegmentDescriptionChange: (value: string) => void
  onSegmentFiltersChange: (filters: SegmentFilters) => void
  onSave: () => void
}

export function SegmentEditorDialog({
  open,
  onOpenChange,
  isEditing,
  segmentName,
  segmentDescription,
  segmentFilters,
  isSaving,
  onSegmentNameChange,
  onSegmentDescriptionChange,
  onSegmentFiltersChange,
  onSave,
}: SegmentEditorDialogProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false)
        else onOpenChange(o)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden"
          onPointerDownOutside={(e) => {
            const t = e.detail.originalEvent.target
            if (isInsidePortaledDropdown(t)) e.preventDefault()
          }}
          onFocusOutside={(e) => {
            const rt = e.detail.originalEvent.relatedTarget
            if (isInsidePortaledDropdown(rt)) e.preventDefault()
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>
              {isEditing ? 'Edit Segment' : 'Create Segment'}
            </DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-2xl flex-col">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="btn-close-absolute flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
            >
              <X className="icon-sm" />
            </button>
            <div className="px-spacing-6 pt-spacing-6 pb-spacing-2 flex-shrink-0">
              <h2 className="title-h6">{isEditing ? 'Edit Segment' : 'Create Segment'}</h2>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                {isEditing
                  ? 'Update the segment name, description, or filters.'
                  : 'Create a saved audience for targeted email broadcasts.'}
              </p>
            </div>
            <div className="px-spacing-6 py-spacing-4 space-y-spacing-3 flex-1 overflow-y-auto">
              <div>
                <label className="body-4 text-[var(--foreground)]">Segment Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={segmentName}
                    onChange={(e) => onSegmentNameChange(e.target.value)}
                    placeholder="e.g., VIP Customers"
                    maxLength={100}
                    className={segmentTextFieldCls}
                  />
                </div>
              </div>
              <div>
                <label className="body-4 text-[var(--foreground)]">Description (optional)</label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={segmentDescription}
                    onChange={(e) => onSegmentDescriptionChange(e.target.value)}
                    placeholder="What this segment is for..."
                    maxLength={500}
                    className={segmentTextFieldCls}
                  />
                </div>
              </div>
              <div>
                <label className="body-3 text-foreground mb-spacing-2 block">Filters</label>
                <SegmentFilterBuilder
                  filters={segmentFilters}
                  onChange={onSegmentFiltersChange}
                  showPreview={true}
                />
              </div>
            </div>
            <div className="px-spacing-6 py-spacing-4 border-border flex flex-shrink-0 items-center justify-between border-t">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || !segmentName.trim()}
                className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10">
                  {isSaving ? 'Saving...' : isEditing ? 'Update Segment' : 'Create Segment'}
                </span>
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
