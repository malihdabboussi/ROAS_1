import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption, SpaceSchema, ViewDef } from '../../types/space-schema'
import { TaskMetaFields } from './TaskMetaFields'

const cellMocks = vi.hoisted(() => ({
  AssigneeCell: vi.fn(
    ({
      customTrigger,
      onChange,
    }: {
      customTrigger?: ReactNode
      onChange: (next: Array<{ type: 'human' | 'agent'; id: string }>) => void
    }) => (
      <button type="button" onClick={() => onChange([{ type: 'human', id: 'user-2' }])}>
        {customTrigger ?? 'Assign'}
      </button>
    ),
  ),
  DueDateCell: vi.fn(
    ({
      customTrigger,
      onChange,
    }: {
      customTrigger?: ReactNode
      onChange: (patch: { start_date?: string | null; due_date?: string | null }) => void
    }) => (
      <button type="button" onClick={() => onChange({ due_date: '2026-07-10' })}>
        {customTrigger ?? 'Due Jul 10'}
      </button>
    ),
  ),
  MultiSelectCell: vi.fn(
    ({
      customTrigger,
      onChange,
    }: {
      customTrigger?: ReactNode
      onChange: (next: string[]) => void
    }) => (
      <button type="button" onClick={() => onChange(['tag-launch'])}>
        {customTrigger ?? 'Tags'}
      </button>
    ),
  ),
  OptionDot: vi.fn(({ color }: { color?: string }) => (
    <span data-testid="option-dot">{color ?? 'none'}</span>
  )),
  ResponsiveTagChips: vi.fn(({ options }: { options: Array<{ label: string }> }) => (
    <span>{options.map((option) => option.label).join(', ')}</span>
  )),
  SelectCell: vi.fn(
    ({
      customTrigger,
      onChange,
      value,
    }: {
      customTrigger?: ReactNode
      onChange: (next: string | null) => void
      value: string | null
    }) => (
      <button type="button" onClick={() => onChange(value === 'high' ? null : 'high')}>
        {customTrigger ?? 'Select'}
      </button>
    ),
  ),
  SpaceCell: vi.fn(
    ({
      field,
      onChange,
      value,
    }: {
      field: FieldDef
      onChange: (next: unknown) => void
      value: unknown
    }) => (
      <button type="button" onClick={() => onChange('expanded-value')}>
        {field.name}: {String(value ?? 'empty')}
      </button>
    ),
  ),
}))

vi.mock('../cells/AssigneeCell', () => ({
  AssigneeCell: cellMocks.AssigneeCell,
}))

vi.mock('../cells/DueDateCell', () => ({
  DueDateCell: cellMocks.DueDateCell,
}))

vi.mock('../cells/MultiSelectCell', () => ({
  MultiSelectCell: cellMocks.MultiSelectCell,
}))

vi.mock('../cells/ResponsiveTagChips', () => ({
  ResponsiveTagChips: cellMocks.ResponsiveTagChips,
}))

vi.mock('../cells/SelectCell', () => ({
  SelectCell: cellMocks.SelectCell,
}))

vi.mock('../cells/SpaceCell', () => ({
  SpaceCell: cellMocks.SpaceCell,
}))

vi.mock('../OptionBadge', () => ({
  OptionDot: cellMocks.OptionDot,
}))

const statusOptions: SelectOption[] = [
  { id: 'todo', label: 'To do', color: 'slate', group: 'not_started' },
  { id: 'in_progress', label: 'In progress', color: 'blue', group: 'active' },
  { id: 'done', label: 'Done', color: 'emerald', group: 'done' },
]

const fields: FieldDef[] = [
  { id: 'status', name: 'Status', type: 'select', options: statusOptions },
  {
    id: 'priority',
    name: 'Priority',
    type: 'select',
    options: [{ id: 'high', label: 'High', color: 'red' }],
  },
  { id: 'assignee', name: 'Assignee', type: 'assignee' },
  { id: 'due_date', name: 'Due date', type: 'date' },
  {
    id: 'tags',
    name: 'Tags',
    type: 'multi_select',
    options: [{ id: 'tag-launch', label: 'Launch', color: 'blue' }],
  },
  {
    id: 'category',
    name: 'Category',
    type: 'select',
    options: [{ id: 'ops', label: 'Ops', color: 'violet' }],
  },
  { id: 'budget', name: 'Budget', type: 'text' },
]

const activeView: ViewDef = {
  id: 'view-1',
  name: 'Tasks',
  type: 'list',
  sort: [],
  visible_fields: fields.map((field) => field.id),
}

const spaceSchema: SpaceSchema = {
  version: 1,
  fields,
  views: [activeView],
}

const roster: TeamRosterEntry[] = [
  {
    participant_id: 'participant-1',
    kind: 'human',
    org_id: 'org-1',
    user_id: 'user-1',
    agent_key: null,
    display_name: 'Jordan Lee',
    avatar_url: null,
    role_label: null,
    specialties: [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: null,
    org_role: null,
    email: 'jordan@example.com',
    created_at: '2026-06-30T08:00:00.000Z',
    updated_at: null,
  },
]

const item: SpaceItem = {
  id: 'task-1',
  space_id: 'space-1',
  org_id: 'org-1',
  user_id: 'user-1',
  title: 'Launch task',
  status: 'todo',
  priority: 'high',
  assignee_type: 'human',
  assignee_id: 'user-1',
  assignees: [{ type: 'human', id: 'user-1' }],
  start_date: null,
  due_date: '2026-07-04',
  recurrence: null,
  parent_item_id: null,
  recurrence_parent_id: null,
  description: null,
  notes: null,
  doc_body: null,
  source: 'manual',
  linked_mission_id: null,
  form_id: null,
  task_execution_status: null,
  is_private: false,
  share_link_enabled: false,
  share_token: null,
  sort_order: 0,
  custom_data: {
    budget: '1000',
    category: 'ops',
    tags: ['tag-launch'],
  },
  created_at: '2026-06-30T08:00:00.000Z',
  updated_at: '2026-06-30T08:00:00.000Z',
}

describe('TaskMetaFields', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders core metadata, updates fields, expands custom fields, and settles across rerenders', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onUpdateField = vi.fn()
    const { rerender } = render(
      <TaskMetaFields
        item={item}
        activeView={activeView}
        spaceSchema={spaceSchema}
        allFields={fields}
        roster={roster}
        currentUserId="user-1"
        onUpdateField={onUpdateField}
      />,
    )

    expect(screen.getByText('To do')).toBeInTheDocument()
    expect(screen.getByText('Me')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Launch')).toBeInTheDocument()
    expect(screen.getByText('Ops')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Mark as done'))
    expect(onUpdateField).toHaveBeenLastCalledWith({ status: 'done' })

    fireEvent.click(screen.getByRole('button', { name: /1 more field/i }))
    expect(screen.getByText('Budget: 1000')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Budget: 1000' }))
    expect(onUpdateField).toHaveBeenLastCalledWith({
      custom_data: {
        ...item.custom_data,
        budget: 'expanded-value',
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Clear assignee' }))
    expect(onUpdateField).toHaveBeenLastCalledWith({
      assignees: [],
      assignee_type: 'unassigned',
      assignee_id: null,
    })

    rerender(
      <TaskMetaFields
        item={{ ...item, status: 'in_progress' }}
        activeView={activeView}
        spaceSchema={spaceSchema}
        allFields={fields}
        roster={roster}
        currentUserId="user-1"
        onUpdateField={onUpdateField}
      />,
    )
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })
})
