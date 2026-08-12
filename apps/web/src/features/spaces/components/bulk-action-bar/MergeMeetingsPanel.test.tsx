import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '../../types'
import { MergeMeetingsPanel } from './MergeMeetingsPanel'

vi.mock('./FloatingPanel', () => ({
  FloatingPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function item(input: Pick<SpaceItem, 'id' | 'title'> & Partial<SpaceItem>): SpaceItem {
  return {
    space_id: 'space-1',
    org_id: 'org-1',
    user_id: 'user-1',
    description: null,
    status: 'inbox',
    priority: null,
    assignee_type: 'unassigned',
    assignee_id: null,
    assignees: [],
    start_date: null,
    due_date: null,
    recurrence: null,
    parent_item_id: null,
    recurrence_parent_id: null,
    notes: null,
    doc_body: null,
    source: 'manual',
    linked_mission_id: null,
    form_id: null,
    task_execution_status: null,
    sort_order: 0,
    custom_data: { entry_type: 'call' },
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    created_at: '2026-08-10T00:00:00.000Z',
    updated_at: '2026-08-10T00:00:00.000Z',
    ...input,
  }
}

const items = [
  item({ id: 'plain', title: 'Meeting: strategy call' }),
  item({
    id: 'recorded',
    title: 'Fathom meeting: strategy call',
    custom_data: { entry_type: 'call', recording_url: 'https://fathom.video/r/1' },
  }),
]

describe('MergeMeetingsPanel', () => {
  afterEach(cleanup)

  it('preselects the best survivor and flags recordings', () => {
    render(
      <MergeMeetingsPanel
        anchorRef={{ current: null }}
        selectedItems={items}
        busy={false}
        onMerge={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Merge 2 meetings')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Fathom meeting: strategy call/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Meeting: strategy call/ })).not.toBeChecked()
    expect(screen.getByText('Has recording')).toBeInTheDocument()
  })

  it('merges into the picked survivor', () => {
    const onMerge = vi.fn()
    render(
      <MergeMeetingsPanel
        anchorRef={{ current: null }}
        selectedItems={items}
        busy={false}
        onMerge={onMerge}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: /Meeting: strategy call/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Merge meetings' }))

    expect(onMerge).toHaveBeenCalledWith('plain')
  })

  it('cancels without merging', () => {
    const onMerge = vi.fn()
    const onClose = vi.fn()
    render(
      <MergeMeetingsPanel
        anchorRef={{ current: null }}
        selectedItems={items}
        busy={false}
        onMerge={onMerge}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
    expect(onMerge).not.toHaveBeenCalled()
  })

  it('disables the confirm button while busy', () => {
    render(
      <MergeMeetingsPanel
        anchorRef={{ current: null }}
        selectedItems={items}
        busy={true}
        onMerge={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Merge meetings' })).toBeDisabled()
  })
})
