import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FieldDef } from '@/lib/spaces/space-schema-types'
import { MeetingWorkspaceStatusSelect } from './MeetingWorkspaceStatusSelect'

const statusField: FieldDef = {
  id: 'call_status',
  name: 'Call status',
  type: 'select',
  options: [
    { id: 'live', label: 'Live', color: 'emerald' },
    { id: 'completed', label: 'Completed', color: 'blue' },
    { id: 'no_show', label: 'No Show', color: 'red' },
    { id: 'rescheduled', label: 'Rescheduled', color: 'amber' },
  ],
}

describe('MeetingWorkspaceStatusSelect', () => {
  afterEach(() => {
    cleanup()
  })

  it('uses the branded status picker and writes the Call status id', () => {
    const onChange = vi.fn()
    render(
      <MeetingWorkspaceStatusSelect field={statusField} value="completed" onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(onChange).toHaveBeenCalledWith('live')
  })
})
