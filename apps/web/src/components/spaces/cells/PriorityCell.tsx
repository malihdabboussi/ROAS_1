import type { ListItemPriority } from '@/lib/spaces'
import { SelectCell } from './SelectCell'

interface Props {
  value: ListItemPriority
  onChange: (priority: ListItemPriority) => void
}

export function PriorityCell({ value, onChange }: Props) {
  const priorityField = {
    id: 'priority',
    name: 'Priority',
    type: 'select' as const,
    options: [
      { id: 'low', label: 'Low', color: 'slate' },
      { id: 'medium', label: 'Medium', color: 'blue' },
      { id: 'high', label: 'High', color: 'orange' },
      { id: 'urgent', label: 'Urgent', color: 'red' },
    ],
  }
  return (
    <SelectCell
      field={priorityField}
      value={value}
      onChange={(next) => onChange(next ? (String(next) as ListItemPriority) : null)}
    />
  )
}
