'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import { cn } from '@/lib/utils/cn'
import type { AutomationAction, AutomationTrigger, FieldDef } from '../../types/space-schema'
import { PromptTemplateEditor, type VarItem } from './PromptTemplateEditor'

interface ContactFieldDescriptor {
  id: string
  label: string
  /** `template` = `PromptTemplateEditor`. `enum` = `AutomationSolidSelect` over `options`. */
  kind: 'template' | 'enum'
  options?: { value: string; label: string }[]
  placeholder?: string
}

/** Contact column whitelist for the “Add field” dropdown.
 * `email` / `first_name` / `last_name` are intentionally excluded — they are covered by the
 * dedicated `email_template` / `name_template` inputs above. */
const CONTACT_FIELD_DESCRIPTORS: ContactFieldDescriptor[] = [
  { id: 'phone', label: 'Phone', kind: 'template', placeholder: 'Phone…' },
  { id: 'business_name', label: 'Business name', kind: 'template', placeholder: 'Business…' },
  { id: 'website', label: 'Website', kind: 'template', placeholder: 'Website…' },
  {
    id: 'contact_type',
    label: 'Contact type',
    kind: 'enum',
    options: [
      { value: 'lead', label: 'Lead' },
      { value: 'customer', label: 'Customer' },
    ],
  },
  { id: 'contact_source', label: 'Source', kind: 'template', placeholder: 'Source…' },
  { id: 'city', label: 'City', kind: 'template', placeholder: 'City…' },
  { id: 'state', label: 'State', kind: 'template', placeholder: 'State / region…' },
  { id: 'country', label: 'Country', kind: 'template', placeholder: 'Country…' },
]

interface AutomationContactFieldsEditorProps {
  /** Map of contact column id → template string (rendered server-side). */
  values: Record<string, string>
  onChange: (next: Record<string, string>) => void
  fields: FieldDef[]
  templateVars: VarItem[]
  includeSystemVars: boolean
  stepContext?: {
    trigger: AutomationTrigger
    actions: AutomationAction[]
    beforeIndex: number
  }
}

export function AutomationContactFieldsEditor({
  values,
  onChange,
  fields,
  templateVars,
  includeSystemVars,
  stepContext,
}: AutomationContactFieldsEditorProps) {
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const selectedIds = useMemo(() => Object.keys(values), [values])
  const availableDescriptors = useMemo(
    () => CONTACT_FIELD_DESCRIPTORS.filter((d) => !selectedIds.includes(d.id)),
    [selectedIds],
  )

  const addOptions: AutomationSolidOption[] = useMemo(
    () => availableDescriptors.map((d) => ({ value: d.id, label: d.label })),
    [availableDescriptors],
  )

  function setFieldValue(fieldId: string, value: string) {
    onChange({ ...values, [fieldId]: value })
  }

  function removeField(fieldId: string) {
    const next: Record<string, string> = { ...values }
    delete next[fieldId]
    onChange(next)
  }

  function addField(fieldId: string) {
    if (!fieldId || values[fieldId] !== undefined) return
    onChange({ ...values, [fieldId]: '' })
    setShowFieldPicker(false)
  }

  const hasRows = selectedIds.length > 0
  const showAdd = availableDescriptors.length > 0

  if (!hasRows && !showAdd) return null

  return (
    <div className="space-y-spacing-3 flex flex-col">
      {hasRows ? (
        <div className="space-y-spacing-2">
          {selectedIds.map((fieldId) => {
            const descriptor = CONTACT_FIELD_DESCRIPTORS.find((d) => d.id === fieldId)
            if (!descriptor) return null
            const raw = values[fieldId] ?? ''
            return (
              <div key={fieldId} className="gap-spacing-2 flex items-start">
                <span
                  className="body-3 text-muted-foreground h-spacing-10 flex w-[120px] shrink-0 items-center truncate"
                  title={descriptor.label}
                >
                  {descriptor.label}
                </span>
                <div className="min-w-0 flex-1">
                  {descriptor.kind === 'enum' ? (
                    <AutomationSolidSelect
                      options={(descriptor.options ?? []).map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      value={raw}
                      onChange={(v) => setFieldValue(fieldId, v)}
                      placeholder={`Select ${descriptor.label.toLowerCase()}`}
                    />
                  ) : (
                    <PromptTemplateEditor
                      value={raw}
                      onChange={(v) => setFieldValue(fieldId, v)}
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeSystemVars}
                      stepContext={stepContext}
                      placeholder={descriptor.placeholder ?? descriptor.label}
                      rows={1}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeField(fieldId)}
                  title="Remove field"
                  aria-label={`Remove ${descriptor.label}`}
                  className="btn-icon-bare h-spacing-10 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="icon-sm" />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}

      {showAdd ? (
        showFieldPicker ? (
          <AutomationSolidSelect
            options={addOptions}
            value=""
            onChange={addField}
            placeholder="Choose field…"
          />
        ) : (
          <div className="py-spacing-1 flex w-full justify-center">
            <button
              type="button"
              onClick={() => setShowFieldPicker(true)}
              title="Add field"
              aria-label="Add contact field"
              className={cn(
                'px-spacing-3 py-spacing-1 gap-spacing-1 rounded-spacing-2 typo-caption inline-flex items-center border border-dashed border-[var(--color-border)] bg-[var(--background)] text-[var(--color-muted-foreground)] shadow-sm transition-all duration-200',
                'hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
              )}
            >
              <Plus className="h-3 w-3" />
              Add Field
            </button>
          </div>
        )
      ) : null}
    </div>
  )
}
