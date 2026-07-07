import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team'
import type { SpaceItem } from '../../types'
import type { FieldDef, SpaceSchema, ViewDef } from '../../types/space-schema'
import { TaskSubtasks } from './TaskSubtasks'

const storeState = {
  activeSpaceId: 'space-1',
  spaces: [{ id: 'space-1', title: 'Launch Space' }],
  createItem: vi.fn(),
  duplicateItem: vi.fn(),
}

const componentMocks = vi.hoisted(() => ({
  BulkActionBar: vi.fn(({ selectedIds }: { selectedIds: Set<string> }) => (
    <div data-testid="bulk-action-bar">selected:{selectedIds.size}</div>
  )),
  DraggableColumnHeaders: vi.fn(
    ({
      onAddField,
    }: {
      onAddField?: (event: React.MouseEvent<HTMLButtonElement>) => void
    }) => (
      <button type="button" onClick={(event) => onAddField?.(event)}>
        Fields
      </button>
    ),
  ),
  SpaceListHeaderCheckbox: vi.fn(
    ({
      checked,
      indeterminate,
      onToggle,
    }: {
      checked: boolean
      indeterminate: boolean
      onToggle: () => void
    }) => (
      <button type="button" onClick={onToggle}>
        header:{checked ? 'checked' : indeterminate ? 'mixed' : 'empty'}
      </button>
    ),
  ),
  SpaceListDndGroupChromeRow: vi.fn(
    ({
      item,
      onOpenDetail,
      onToggleSelect,
      selected,
    }: {
      item: SpaceItem
      onOpenDetail?: (item: SpaceItem) => void
      onToggleSelect: (id: string) => void
      selected: boolean
    }) => (
      <div data-testid={`subtask-row-${item.id}`} data-selected={String(selected)}>
        <span>{item.title}</span>
        <button type="button" onClick={() => onToggleSelect(item.id)}>
          Select {item.title}
        </button>
        <button type="button" onClick={() => onOpenDetail?.(item)}>
          Open {item.title}
        </button>
      </div>
    ),
  ),
  SpaceQuickAdd: vi.fn(
    ({ onSubmitItem }: { onSubmitItem?: (title: string, extra: Record<string, unknown>) => void }) => (
      <button type="button" onClick={() => onSubmitItem?.('New subtask', { priority: 'high' })}>
        Add subtask
      </button>
    ),
  ),
  ViewFieldsVisibilityContent: vi.fn(() => <div data-testid="fields-panel">Fields panel</div>),
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div data-testid="dnd">{children}</div>,
  PointerSensor: vi.fn(),
  pointerWithin: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}))

vi.mock('../BulkActionBar', () => ({
  BulkActionBar: componentMocks.BulkActionBar,
}))

vi.mock('../CustomizeViewPanel', () => ({
  ViewFieldsVisibilityContent: componentMocks.ViewFieldsVisibilityContent,
}))

vi.mock('../DraggableColumnHeaders', () => ({
  DraggableColumnHeaders: componentMocks.DraggableColumnHeaders,
  getDefaultWidth: (fieldId: string) => (fieldId === 'title' ? 420 : 120),
  SpaceListHeaderCheckbox: componentMocks.SpaceListHeaderCheckbox,
}))

vi.mock('../SpaceListDndRow', () => ({
  SpaceListDndGroupChromeRow: componentMocks.SpaceListDndGroupChromeRow,
}))

vi.mock('../SpaceQuickAdd', () => ({
  SpaceQuickAdd: componentMocks.SpaceQuickAdd,
}))

vi.mock('../../store/use-spaces-store', () => {
  const useSpacesStore = (selector?: (state: typeof storeState) => unknown) =>
    selector ? selector(storeState) : storeState
  useSpacesStore.getState = () => storeState
  return { useSpacesStore }
})

const fields: FieldDef[] = [
  { id: 'title', name: 'Title', type: 'text' },
  {
    id: 'status',
    name: 'Status',
    type: 'select',
    options: [
      { id: 'todo', label: 'To do', color: 'slate', group: 'not_started' },
      { id: 'done', label: 'Done', color: 'emerald', group: 'done' },
    ],
  },
]

const activeView: ViewDef = {
  id: 'view-1',
  name: 'List',
  type: 'list',
  sort: [],
  visible_fields: ['title', 'status'],
}

const spaceSchema: SpaceSchema = {
  version: 1,
  fields,
  views: [activeView],
}

const roster: TeamRosterEntry[] = []

function subtaskFixture(overrides: Partial<SpaceItem>): SpaceItem {
  return {
    id: 'subtask-1',
    space_id: 'space-1',
    org_id: 'org-1',
    user_id: 'user-1',
    title: 'Open subtask',
    status: 'todo',
    priority: null,
    assignee_type: 'unassigned',
    assignee_id: null,
    assignees: [],
    start_date: null,
    due_date: null,
    recurrence: null,
    parent_item_id: 'task-1',
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
    custom_data: {},
    created_at: '2026-06-30T08:00:00.000Z',
    updated_at: '2026-06-30T08:00:00.000Z',
    ...overrides,
  }
}

const subtasks = [
  subtaskFixture({ id: 'subtask-open', title: 'Open subtask', status: 'todo', sort_order: 1 }),
  subtaskFixture({ id: 'subtask-done', title: 'Done subtask', status: 'done', sort_order: 2 }),
]

function renderSubtasks(overrides: Partial<Parameters<typeof TaskSubtasks>[0]> = {}) {
  const props: Parameters<typeof TaskSubtasks>[0] = {
    subtasks,
    parentItemId: 'task-1',
    allFields: fields,
    activeView,
    spaceSchema,
    onViewPatch: vi.fn(async () => {}),
    roster,
    currentUserId: 'user-1',
    subtasksSectionCollapsed: false,
    onSubtasksSectionCollapsedChange: vi.fn(),
    onUpdateSubtask: vi.fn(),
    onCreateSubtask: vi.fn(),
    onEditStatuses: vi.fn(),
    onEditCategories: vi.fn(),
    onPushToAgent: vi.fn(async () => {}),
    onCreateOption: vi.fn(),
    onUpdateOption: vi.fn(),
    onDeleteOption: vi.fn(),
    onTagCustomSwatchesChange: vi.fn(),
    onDeleteItem: vi.fn(),
    onOpenTaskDetail: vi.fn(),
    loading: false,
    onRefresh: vi.fn(async () => {}),
    ...overrides,
  }
  return {
    props,
    ...render(<TaskSubtasks {...props} />),
  }
}

describe('TaskSubtasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('mounts subtasks, handles closed rows, selection, quick add, fields menu, and collapse sync', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { props, rerender } = renderSubtasks()

    expect(screen.getByText('Subtasks')).toBeInTheDocument()
    expect(screen.getByText('1 open')).toBeInTheDocument()
    expect(screen.getByText('Open subtask')).toBeInTheDocument()
    expect(screen.queryByText('Done subtask')).not.toBeInTheDocument()
    expect(screen.getByTestId('bulk-action-bar')).toHaveTextContent('selected:0')

    fireEvent.click(screen.getByRole('button', { name: 'Show 1 closed' }))
    expect(screen.getByText('Done subtask')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Select Open subtask' }))
    expect(screen.getByTestId('bulk-action-bar')).toHaveTextContent('selected:1')

    fireEvent.click(screen.getByRole('button', { name: 'Open Open subtask' }))
    expect(props.onOpenTaskDetail).toHaveBeenCalledWith(subtasks[0])

    fireEvent.click(screen.getByRole('button', { name: 'Add subtask' }))
    expect(props.onCreateSubtask).toHaveBeenCalledWith('New subtask', { priority: 'high' })

    fireEvent.click(screen.getByRole('button', { name: 'Fields' }))
    expect(await screen.findByTestId('fields-panel')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Subtasks/ }))
    expect(props.onSubtasksSectionCollapsedChange).toHaveBeenCalledWith(true)

    rerender(<TaskSubtasks {...props} subtasksSectionCollapsed />)
    await waitFor(() => expect(screen.queryByText('Open subtask')).not.toBeInTheDocument())
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })
})
