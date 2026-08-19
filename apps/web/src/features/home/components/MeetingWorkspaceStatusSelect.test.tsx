import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FieldDef } from '@/lib/spaces/space-schema-types'
import { MeetingWorkspaceStatusSelect } from './MeetingWorkspaceStatusSelect'

const statusField: FieldDef = {
  id: 'status',
  name: 'Status',
  type: 'select',
  options: [
    { id: 'logged', label: 'To action', color: 'blue', group: 'not_started' },
    { id: 'needs_follow_up', label: 'Following up', color: 'orange', group: 'active' },
    { id: 'done', label: 'Done', color: 'emerald', group: 'closed' },
  ],
}

describe('MeetingWorkspaceStatusSelect', () => {
  afterEach(() => {
    cleanup()
  })

  it('uses the branded status picker and writes the task status id', () => {
    const onChange = vi.fn()
    render(
      <MeetingWorkspaceStatusSelect
        field={statusField}
        value="needs_follow_up"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Following up' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onChange).toHaveBeenCalledWith('done')
  })
})
