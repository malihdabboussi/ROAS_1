import type { ComponentType } from 'react'
import {
  CalendarDays,
  CircleDot,
  Contact,
  FileText,
  Hash,
  Info,
  ListChecks,
  Type,
  Upload,
  UserRound,
} from 'lucide-react'
import type { FormQuestionType } from '@/lib/forms/forms-api'

export const FORM_QUESTION_TYPES: Array<{
  type: FormQuestionType
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}> = [
  { type: 'short_text', label: 'Short text', description: 'Single-line answer', icon: Type },
  { type: 'long_text', label: 'Long text', description: 'Multi-line answer', icon: FileText },
  { type: 'dates', label: 'Dates', description: 'Date picker', icon: CalendarDays },
  {
    type: 'single_select',
    label: 'Single-select',
    description: 'One option or checkbox',
    icon: CircleDot,
  },
  {
    type: 'multi_select',
    label: 'Multi-select',
    description: 'Multiple options',
    icon: ListChecks,
  },
  { type: 'contact', label: 'Contact info', description: 'Name, email, phone', icon: Contact },
  { type: 'people', label: 'People', description: 'Email or teammate field', icon: UserRound },
  { type: 'uploads', label: 'Uploads', description: 'File attachment', icon: Upload },
  { type: 'number', label: 'Number', description: 'Numeric answer', icon: Hash },
  {
    type: 'info_block',
    label: 'Information Block',
    description: 'Static helper content',
    icon: Info,
  },
]

export function FormQuestionTypePicker({ onPick }: { onPick: (type: FormQuestionType) => void }) {
  return (
    <div className="surface-card border-border rounded-spacing-3 gap-spacing-1 p-spacing-2 grid border">
      {FORM_QUESTION_TYPES.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.type}
            type="button"
            onClick={() => onPick(item.type)}
            className="gap-spacing-3 rounded-spacing-2 hover:bg-hover-subtle px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
          >
            <Icon className="icon-sm text-muted-foreground" />
            <span className="min-w-0">
              <span className="body-3 text-foreground block font-medium">{item.label}</span>
              <span className="typo-caption text-muted-foreground block">{item.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
