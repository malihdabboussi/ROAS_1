import type { ListItemStatus } from '@/lib/spaces'
import { SelectCell } from './SelectCell'

interface StatusCellProps {
  value: ListItemStatus
  onChange: (status: ListItemStatus) => void
}

export function StatusCell({ value, onChange }: StatusCellProps) {
  const statusField = {
    id: 'status',
    name: 'Status',
    type: 'select' as const,
    options: [
      { id: 'todo', label: 'To Do', color: 'cyan' },
      { id: 'in_progress', label: 'In Progress', color: 'amber' },
      { id: 'in_review', label: 'In Review', color: 'violet' },
      { id: 'done', label: 'Done', color: 'emerald' },
    ],
  }
  return (
    <SelectCell
      field={statusField}
      value={value}
      onChange={(next) => onChange(String(next) as ListItemStatus)}
    />
  )
}
