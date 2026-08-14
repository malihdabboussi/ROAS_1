import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FieldDef } from '@/lib/spaces'
import type { YourTurnItem } from '@/lib/your-turn/types'
import { MyTasksInlineStatus } from './MyTasksInlineStatus'

const item = {
  id: 'task-1',
  kind: 'space_item',
  title: 'Send recap',
  preview: null,
  source_url: '/spaces/space-1',
  space_id: 'space-1',
  status: 'todo',
} as YourTurnItem

const statusField = {
  id: 'status',
  name: 'Status',
  type: 'select',
  options: [
    { id: 'todo', label: 'To action', color: 'gray' },
    { id: 'done', label: 'Done', color: 'green' },
  ],
} as FieldDef

describe('MyTasksInlineStatus', () => {
  it('updates a task from the inline canonical status selector', () => {
    const onChanged = vi.fn()
    render(
      <MyTasksInlineStatus
        item={item}
        statusField={statusField}
        status="todo"
        onChanged={onChanged}
      />,
    )

    fireEvent.click(screen.getByText('To action'))
    fireEvent.click(screen.getByText('Done'))

    expect(onChanged).toHaveBeenCalledWith('done')
  })
})
