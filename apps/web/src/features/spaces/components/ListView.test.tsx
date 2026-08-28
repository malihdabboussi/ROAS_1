import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '../types'
import type { FieldDef, ViewDef } from '../types/space-schema'
import { ListView } from './ListView'

const storeState = {
  spaces: [],
  activeSpaceId: 'space-1',
  createItem: vi.fn().mockResolvedValue(undefined),
  deleteItem: vi.fn(),
  duplicateItem: vi.fn(),
  refresh: vi.fn(),
  updateItemsBatch: vi.fn(),
}

const componentMocks = vi.hoisted(() => ({
  DraggableColumnHeaders: vi.fn(
    ({ externalRowControls }: { externalRowControls?: boolean }) => (
      <div data-testid="column-headers" data-external-controls={String(externalRowControls)}>
        Name
      </div>
    ),
  ),
  SpaceListDndGroupChromeRow: vi.fn(
    ({ item, expanded, onToggleExpand }: SpaceListRowMockProps) => (
      <div>
        <span>{item.title}</span>
        <button
          type="button"
          aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
          onClick={onToggleExpand}
        >
          Toggle
        </button>
      </div>
    ),
  ),
}))

type SpaceListRowMockProps = {
  item: SpaceItem
  expanded?: boolean
  onToggleExpand?: () => void
}

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PointerSensor: vi.fn(),
  pointerWithin: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
}))

vi.mock('./BulkActionBar', () => ({ BulkActionBar: () => null }))
vi.mock('./GroupSection', () => ({ GroupSection: () => null }))
vi.mock('./DraggableColumnHeaders', () => ({
  DraggableColumnHeaders: componentMocks.DraggableColumnHeaders,
  getDefaultWidth: (fieldId: string) => (fieldId === 'title' ? 420 : 120),
  SpaceListHeaderCheckbox: () => <input aria-label="Select all" type="checkbox" />,
}))
vi.mock('./SpaceListDndRow', () => ({
  SpaceListDndGroupChromeRow: componentMocks.SpaceListDndGroupChromeRow,
}))
vi.mock('./SpaceQuickAdd', () => ({ SpaceQuickAdd: () => null }))
vi.mock('../store/use-spaces-store', () => {
  const useSpacesStore = (selector?: (state: typeof storeState) => unknown) =>
    selector ? selector(storeState) : storeState
  useSpacesStore.getState = () => storeState
  return { useSpacesStore }
})

const fields: FieldDef[] = [
  { id: 'title', name: 'Name', type: 'text' },
  {
    id: 'status',
    name: 'Status',
    type: 'select',
    options: [{ id: 'todo', label: 'To do', color: 'slate', group: 'not_started' }],
  },
]

const activeView: ViewDef = {
  id: 'all-tasks-list',
  type: 'list',
  name: 'List',
  visible_fields: ['status', 'title'],
  subtasks_display: 'collapsed',
}

const item: SpaceItem = {
  id: 'task-1',
  space_id: 'space-1',
  org_id: 'org-1',
  user_id: 'user-1',
  title: 'Parent task',
  status: 'todo',
  priority: null,
  assignee_type: 'unassigned',
  assignee_id: null,
  assignees: [],
  start_date: null,
  due_date: null,
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
  custom_data: {},
  created_at: '2026-08-28T12:00:00.000Z',
  updated_at: '2026-08-28T12:00:00.000Z',
}

function renderList() {
  return render(
    <ListView
      items={[item]}
      visibleFields={fields}
      roster={[]}
      currentUserId="user-1"
      onUpdateItem={vi.fn().mockResolvedValue(undefined)}
      onPushToAgent={vi.fn().mockResolvedValue(undefined)}
      activeView={activeView}
      allFields={fields}
      onViewChange={vi.fn().mockResolvedValue(undefined)}
      onAddItemInGroup={vi.fn().mockResolvedValue(undefined)}
      onDeleteItem={vi.fn()}
    />,
  )
}

describe('ListView task row controls', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('reserves the external row-control rail before the Name header', () => {
    const { container } = renderList()

    expect(screen.getByTestId('column-headers')).toHaveAttribute(
      'data-external-controls',
      'true',
    )
    expect(container.querySelector('.w-28')).toBeInTheDocument()
  })

  it('opens the inline subtask composer when expanding a childless task', () => {
    renderList()

    fireEvent.click(screen.getByRole('button', { name: 'Expand subtasks' }))

    expect(screen.getByPlaceholderText('Add subtask')).toHaveFocus()
  })
})
