'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { FIELD_TYPE_OPTIONS } from '@/lib/properties/custom-fields'
import type { FieldType } from '@/lib/properties/custom-fields'

interface CustomFieldEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditing: boolean
  fieldName: string
  fieldType: FieldType
  dropdownOptions: string[]
  newOption: string
  mergeTagPreview: string
  isSaving: boolean
  onFieldNameChange: (value: string) => void
  onFieldTypeChange: (value: FieldType) => void
  onDropdownOptionsChange: (options: string[]) => void
  onNewOptionChange: (value: string) => void
  onAddOption: () => void
  onRemoveOption: (index: number) => void
  onSave: () => void
}

export function CustomFieldEditorDialog({
  open,
  onOpenChange,
  isEditing,
  fieldName,
  fieldType,
  dropdownOptions,
  newOption,
  mergeTagPreview,
  isSaving,
  onFieldNameChange,
  onFieldTypeChange,
  onDropdownOptionsChange,
  onNewOptionChange,
  onAddOption,
  onRemoveOption,
  onSave,
}: CustomFieldEditorDialogProps) {
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
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>
              {isEditing ? 'Edit Custom Field' : 'Create Custom Field'}
            </DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="btn-icon-bare btn-close-absolute"
            >
              <X className="icon-sm" />
            </button>
            <div className="px-spacing-6 pt-spacing-6 pb-spacing-2 flex-shrink-0">
              <h2 className="title-h6">
                {isEditing ? 'Edit Custom Field' : 'Create Custom Field'}
              </h2>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                {isEditing
                  ? 'Update the field name or type.'
                  : 'Create a custom field to track additional contact info.'}
              </p>
            </div>
            <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
              <div>
                <label className="body-3 text-foreground">Field Name</label>
                <div className="mt-spacing-2">
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => onFieldNameChange(e.target.value)}
                    placeholder="e.g., Budget, Industry"
                    maxLength={50}
                    className="input-glass w-full"
                  />
                </div>
                {mergeTagPreview && (
                  <p className="typo-caption text-muted-foreground mt-spacing-1">
                    Merge tag: {mergeTagPreview}
                  </p>
                )}
              </div>
              <div>
                <label className="body-3 text-foreground">Field Type</label>
                <div className="mt-spacing-2 gap-spacing-2 grid grid-cols-2">
                  {FIELD_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onFieldTypeChange(option.value)}
                      className={`p-spacing-3 rounded-spacing-2 border text-left transition-all ${fieldType === option.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
                    >
                      <div className="body-3 text-foreground font-medium">{option.label}</div>
                      <div className="typo-caption text-muted-foreground">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              {fieldType === 'dropdown' && (
                <div>
                  <label className="body-3 text-foreground">Dropdown Options</label>
                  <div className="mt-spacing-2 space-y-spacing-2">
                    {dropdownOptions.map((option, idx) => (
                      <div key={idx} className="gap-spacing-2 flex items-center">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const n = [...dropdownOptions]
                            n[idx] = e.target.value
                            onDropdownOptionsChange(n)
                          }}
                          className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg text-foreground flex-1 border"
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveOption(idx)}
                          className="btn-icon-glass-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <div className="gap-spacing-2 flex items-center">
                      <input
                        type="text"
                        value={newOption}
                        onChange={(e) => onNewOptionChange(e.target.value)}
                        placeholder="Add option..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            onAddOption()
                          }
                        }}
                        className="input-glass flex-1"
                      />
                      <button
                        type="button"
                        onClick={onAddOption}
                        disabled={!newOption.trim()}
                        className="button-glass-accent px-spacing-3 py-spacing-1 body-3 rounded-lg font-medium disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                disabled={isSaving || !fieldName.trim()}
                className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10">
                  {isSaving ? 'Saving...' : isEditing ? 'Update Field' : 'Create Field'}
                </span>
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
