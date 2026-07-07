import type { ComponentType } from 'react'
import {
  BarChart3,
  Calendar,
  CheckSquare,
  CircleDot,
  Contact,
  DollarSign,
  Hash,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  Phone,
  Star,
  Tags,
  Type,
} from 'lucide-react'
import type { FieldType } from '../../../../types/space-schema'

export interface CreatableFieldTypeMeta {
  type: FieldType
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
  /** When true, the editor renders the options builder (`SelectOption[]`). */
  hasOptions: boolean
}

/** Order matches ClickUp's "All" section in the screenshots. System types omitted. */
export const CREATABLE_FIELD_TYPES: CreatableFieldTypeMeta[] = [
  {
    type: 'select',
    label: 'Dropdown',
    description: 'Pick one option',
    icon: CircleDot,
    hasOptions: true,
  },
  {
    type: 'multi_select',
    label: 'Multi-select',
    description: 'Pick multiple options',
    icon: Tags,
    hasOptions: true,
  },
  { type: 'text', label: 'Text', description: 'Single-line text', icon: Type, hasOptions: false },
  { type: 'date', label: 'Date', description: 'Calendar date', icon: Calendar, hasOptions: false },
  { type: 'number', label: 'Number', description: 'Numeric value', icon: Hash, hasOptions: false },
  {
    type: 'checkbox',
    label: 'Checkbox',
    description: 'On / off toggle',
    icon: CheckSquare,
    hasOptions: false,
  },
  {
    type: 'currency',
    label: 'Money',
    description: 'Currency amount',
    icon: DollarSign,
    hasOptions: false,
  },
  { type: 'url', label: 'Website', description: 'URL', icon: LinkIcon, hasOptions: false },
  { type: 'email', label: 'Email', description: 'Email address', icon: Mail, hasOptions: false },
  { type: 'phone', label: 'Phone', description: 'Phone number', icon: Phone, hasOptions: false },
  { type: 'rating', label: 'Rating', description: '0–5 stars', icon: Star, hasOptions: false },
  {
    type: 'progress',
    label: 'Progress',
    description: '0–100% bar',
    icon: BarChart3,
    hasOptions: false,
  },
  {
    type: 'media',
    label: 'Files',
    description: 'Image / file attachment',
    icon: ImageIcon,
    hasOptions: false,
  },
  {
    type: 'contact',
    label: 'Contact',
    description: 'Link to a CRM contact',
    icon: Contact,
    hasOptions: false,
  },
]

export function findCreatableType(type: FieldType): CreatableFieldTypeMeta | undefined {
  return CREATABLE_FIELD_TYPES.find((meta) => meta.type === type)
}

export function filterCreatableTypes(query: string): CreatableFieldTypeMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return CREATABLE_FIELD_TYPES
  return CREATABLE_FIELD_TYPES.filter(
    (meta) => meta.label.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q),
  )
}
