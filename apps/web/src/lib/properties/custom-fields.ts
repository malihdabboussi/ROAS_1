export type FieldType = 'text' | 'number' | 'date' | 'dropdown' | 'boolean'

export interface CustomFieldDefinition {
  id: string
  user_id: string
  name: string
  field_key: string
  field_type: FieldType
  options: string[]
  default_value: string | null
  is_required: boolean
  is_system?: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface CreateCustomFieldInput {
  name: string
  field_type?: FieldType
  options?: string[]
  default_value?: string | null
  is_required?: boolean
}

export interface UpdateCustomFieldInput {
  name?: string
  field_type?: FieldType
  options?: string[]
  default_value?: string | null
  is_required?: boolean
  display_order?: number
}

export const FIELD_TYPE_OPTIONS: Array<{
  value: FieldType
  label: string
  description: string
}> = [
  { value: 'text', label: 'Text', description: 'Short text input' },
  { value: 'number', label: 'Number', description: 'Numeric value' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'dropdown', label: 'Dropdown', description: 'Select from predefined options' },
  { value: 'boolean', label: 'Yes/No', description: 'Toggle switch' },
] as const

export function getFieldTypeLabel(fieldType: FieldType): string {
  const option = FIELD_TYPE_OPTIONS.find((o) => o.value === fieldType)
  return option?.label || 'Text'
}
