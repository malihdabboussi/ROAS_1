import type { FormQuestion } from '@/lib/forms/forms-api'
import { getContactSubfieldMeta, resolveContactSubfields } from './contact-subfields'

export const TASK_TITLE_SUBFIELD_SEP = '::'
export const AUTO_TASK_TITLE_SOURCE = 'auto'
export const AUTO_TASK_TITLE_LABEL = 'Auto'

export const AUTO_TASK_TITLE_PEEK_TITLE = 'Auto task title'

export const AUTO_TASK_TITLE_PEEK_BODY =
  'Vibey picks the task title automatically using the first available value below.'

export const AUTO_TASK_TITLE_PEEK_STEPS = [
  'Contact name (full name or first + last)',
  'Contact email',
  'New form "[Form name]" is Submitted',
] as const

export type TaskTitlePickerItem =
  | {
      kind: 'auto'
      value: typeof AUTO_TASK_TITLE_SOURCE
      label: typeof AUTO_TASK_TITLE_LABEL
    }
  | { kind: 'field'; value: string; label: string }
  | {
      kind: 'contact_group'
      questionId: string
      label: string
      subfields: Array<{ value: string; label: string }>
    }

export function encodeContactSubfieldTaskTitleSource(
  questionId: string,
  subfieldId: string,
): string {
  return `${questionId}${TASK_TITLE_SUBFIELD_SEP}${subfieldId}`
}

export function buildTaskTitlePickerItems(questions: FormQuestion[]): TaskTitlePickerItem[] {
  const items: TaskTitlePickerItem[] = [
    {
      kind: 'auto',
      value: AUTO_TASK_TITLE_SOURCE,
      label: AUTO_TASK_TITLE_LABEL,
    },
  ]

  for (const question of questions) {
    if (question.type === 'info_block') continue
    const label = question.label?.trim() || 'Untitled question'

    if (question.type === 'contact') {
      const subfields = resolveContactSubfields(question).flatMap((subfieldId) => {
        const meta = getContactSubfieldMeta(subfieldId)
        if (!meta) return []
        return [
          {
            value: encodeContactSubfieldTaskTitleSource(question.id, subfieldId),
            label: meta.label,
          },
        ]
      })
      if (subfields.length === 0) continue
      items.push({
        kind: 'contact_group',
        questionId: question.id,
        label,
        subfields,
      })
      continue
    }

    items.push({
      kind: 'field',
      value: question.id,
      label,
    })
  }

  return items
}

export function taskTitleSourceLabel(items: TaskTitlePickerItem[], value: string): string | null {
  const resolved = value === AUTO_TASK_TITLE_SOURCE || !value ? AUTO_TASK_TITLE_SOURCE : value

  for (const item of items) {
    if (item.kind === 'auto' && resolved === AUTO_TASK_TITLE_SOURCE) return item.label
    if (item.kind === 'field' && item.value === resolved) return item.label
    if (item.kind === 'contact_group') {
      const subfield = item.subfields.find((entry) => entry.value === resolved)
      if (subfield) return `${item.label} · ${subfield.label}`
    }
  }

  return null
}
