import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '@/features/spaces/types'
import { AllMeetingsNativeList } from './AllMeetingsNativeList'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/features/spaces/components/ListView', () => ({
  ListView: ({
    items,
    visibleFields,
    onOpenDetail,
  }: {
    items: SpaceItem[]
    visibleFields: Array<{ id: string }>
    onOpenDetail?: (item: SpaceItem) => void
  }) => (
    <div>
      <p>{visibleFields.map((field) => field.id).join(',')}</p>
      <button type="button" onClick={() => onOpenDetail?.(items[0]!)}>
        Open {items[0]?.title}
      </button>
    </div>
  ),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (
    selector: (state: {
      roster: []
      currentUserId: null
      loadRoster: () => Promise<void>
    }) => unknown,
  ) =>
    selector({
      roster: [],
      currentUserId: null,
      loadRoster: async () => undefined,
    }),
}))

const item = {
  id: 'call-1',
  space_id: 'space-1',
  org_id: 'org-1',
  user_id: 'user-1',
  title: 'Cydcor weekly',
  status: 'logged',
  priority: null,
  assignee_type: 'unassigned' as const,
  assignee_id: null,
  assignees: [],
  start_date: null,
  due_date: null,
  recurrence: null,
  description: null,
  parent_item_id: null,
  recurrence_parent_id: null,
  notes: null,
  doc_body: null,
  source: 'fathom' as const,
  linked_mission_id: null,
  form_id: null,
  task_execution_status: null,
  sort_order: 0,
  custom_data: { entry_type: 'call' },
  is_private: false,
  share_link_enabled: false,
  share_token: null,
  created_at: '2026-08-18T00:00:00.000Z',
  updated_at: '2026-08-18T00:00:00.000Z',
} satisfies SpaceItem

describe('AllMeetingsNativeList', () => {
  afterEach(() => {
    cleanup()
    push.mockReset()
  })

  it('uses All Meetings columns including workspaces, Host, Attendees, and Call status', () => {
    render(<AllMeetingsNativeList items={[item]} reload={async () => undefined} />)
    expect(
      screen.getByText(
        'title,call_kind,campaign_name,space_title,host,attendees,call_date,call_status,recording_url',
      ),
    ).toBeInTheDocument()
  })

  it('opens through onOpenItem when provided', () => {
    const onOpenItem = vi.fn()
    render(
      <AllMeetingsNativeList
        items={[item]}
        reload={async () => undefined}
        onOpenItem={onOpenItem}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open Cydcor weekly' }))
    expect(onOpenItem).toHaveBeenCalledWith(item)
    expect(push).not.toHaveBeenCalled()
  })
})
