'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { AutomationSolidSelect, type AutomationSolidOption } from '@/components/ui/forms/AutomationSolidSelect'
import { cn } from '@/lib/utils/cn'
import type { FieldDef, AutomationAction, AutomationTrigger } from '../../types/space-schema'
import { OptionDot } from '../OptionBadge'
import { isCustomAutomationField } from './automation-catalog'
import { AutomationToggleChip } from './automation-toggle-chip'
import { PromptTemplateEditor, type TokenKind, type VarItem } from './PromptTemplateEditor'

interface AutomationTaskFieldsEditorProps {
  /** Map of field id → static value for the new task's `custom_data`. */
  values: Record<string, unknown>
  fields: FieldDef[]
  /** Trigger + step tokens for the `+` insert menu (same as task title/notes). */
  extraVars?: VarItem[]
  includeSystemVars?: boolean
  stepContext?: {
    trigger: AutomationTrigger
    actions: AutomationAction[]
    beforeIndex: number
  }
  onChange: (next: Record<string, unknown>) => void
}

/** Rows: `[Field name] [value editor] [trash]` for each picked custom field, plus an “+ Add Field” chip (same style as flow “Add step”) that opens the field picker. */
export function AutomationTaskFieldsEditor({
  values,
  fields,
  extraVars,
  includeSystemVars,
  stepContext,
  onChange,
}: AutomationTaskFieldsEditorProps) {
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const customFields = useMemo(() => fields.filter(isCustomAutomationField), [fields])
  const selectedIds = useMemo(() => Object.keys(values), [values])
  const availableFields = useMemo(
    () => customFields.filter((f) => !selectedIds.includes(f.id)),
    [customFields, selectedIds],
  )

  const addOptions: AutomationSolidOption[] = useMemo(
    () =>
      availableFields.map((f) => ({
        value: f.id,
        label: f.name,
      })),
    [availableFields],
  )

  function setFieldValue(fieldId: string, value: unknown) {
    onChange({ ...values, [fieldId]: value })
  }

  function removeField(fieldId: string) {
    const next: Record<string, unknown> = { ...values }
    delete next[fieldId]
    onChange(next)
  }

  function addField(fieldId: string) {
    if (!fieldId || values[fieldId] !== undefined) return
    const field = customFields.find((f) => f.id === fieldId)
    if (!field) return
    onChange({ ...values, [fieldId]: defaultValueForField(field) })
    setShowFieldPicker(false)
  }

  const hasRows = selectedIds.length > 0
  const showAdd = availableFields.length > 0

  if (!hasRows && !showAdd) return null

  return (
    <div className="space-y-spacing-3 flex flex-col">
      {hasRows ? (
        <div className="space-y-spacing-2">
          {selectedIds.map((fieldId) => {
            const field = customFields.find((f) => f.id === fieldId)
            if (!field) return null
            return (
              <div key={fieldId} className="gap-spacing-2 flex items-start">
                <span
                  className="body-3 text-muted-foreground h-spacing-10 flex w-[120px] shrink-0 items-center truncate"
                  title={field.name}
                >
                  {field.name}
                </span>
                <div className="min-w-0 flex-1">
                  <FieldValueEditor
                    field={field}
                    value={values[fieldId]}
                    onChange={(v) => setFieldValue(fieldId, v)}
                    fields={fields}
                    extraVars={extraVars}
                    includeSystemVars={includeSystemVars}
                    stepContext={stepContext}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeField(fieldId)}
                  title="Remove field"
                  aria-label={`Remove ${field.name}`}
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
              aria-label="Add custom field"
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

function defaultValueForField(field: FieldDef): unknown {
  switch (field.type) {
    case 'multi_select':
      return []
    case 'checkbox':
      return false
    case 'number':
    case 'currency':
    case 'rating':
    case 'progress':
      return ''
    default:
      return ''
  }
}

function templateTokenKindForField(field: FieldDef): TokenKind | undefined {
  switch (field.type) {
    case 'email':
      return 'email'
    case 'phone':
      return 'phone'
    case 'date':
      return 'date'
    default:
      return undefined
  }
}

function FieldValueEditor({
  field,
  value,
  onChange,
  fields,
  extraVars,
  includeSystemVars,
  stepContext,
}: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
  fields: FieldDef[]
  extraVars?: VarItem[]
  includeSystemVars?: boolean
  stepContext?: {
    trigger: AutomationTrigger
    actions: AutomationAction[]
    beforeIndex: number
  }
}) {
  switch (field.type) {
    case 'select': {
      const options: AutomationSolidOption[] = (field.options ?? []).map((o) => ({
        value: o.id,
        label: o.label,
        leading: o.color ? <OptionDot color={o.color} size="sm" /> : undefined,
      }))
      return (
        <AutomationSolidSelect
          options={options}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          placeholder={`Select ${field.name.toLowerCase()}`}
        />
      )
    }
    case 'multi_select': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      const opts = field.options ?? []
      if (opts.length === 0) {
        return (
          <span className="body-3 text-muted-foreground">No options defined for this field</span>
        )
      }
      return (
        <div className="gap-spacing-1 flex flex-wrap">
          {opts.map((o) => {
            const isOn = selected.includes(o.id)
            return (
              <AutomationToggleChip
                key={o.id}
                size="compact"
                selected={isOn}
                onClick={() =>
                  onChange(isOn ? selected.filter((s) => s !== o.id) : [...selected, o.id])
                }
              >
                {o.color ? <OptionDot color={o.color} size="sm" /> : null}
                {o.label}
              </AutomationToggleChip>
            )
          })}
        </div>
      )
    }
    case 'checkbox': {
      const isOn = !!value
      return (
        <AutomationToggleChip size="field" selected={isOn} onClick={() => onChange(!isOn)}>
          {isOn ? 'True' : 'False'}
        </AutomationToggleChip>
      )
    }
    default: {
      const str = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
      return (
        <PromptTemplateEditor
          value={str}
          onChange={(v) => onChange(v)}
          fields={fields}
          extraVars={extraVars}
          includeSystemVars={includeSystemVars}
          stepContext={stepContext}
          placeholder={`${field.name}…`}
          tokenKind={templateTokenKindForField(field)}
          rows={1}
        />
      )
    }
  }
}
