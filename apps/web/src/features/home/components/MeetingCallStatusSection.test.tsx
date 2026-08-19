import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FieldDef } from '@/lib/spaces/space-schema-types'
import { MeetingCallStatusSection } from './MeetingCallStatusSection'

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

describe('MeetingCallStatusSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('puts Continue in chat, task status, and recap actions on one row', () => {
    const onContinue = vi.fn()
    render(
      <MeetingCallStatusSection
        statusField={statusField}
        statusValue="needs_follow_up"
        hostLabel={null}
        isLive={false}
        isPostCall
        hasRecording
        joinUrl={null}
        starting={false}
        ending={false}
        canContinue
        onStatusChange={vi.fn()}
        onContinue={onContinue}
        onStart={vi.fn()}
        onEnd={vi.fn()}
        onPostCallAction={vi.fn()}
      />,
    )

    const continueButton = screen.getByRole('button', { name: 'Continue in chat' })
    const row = continueButton.parentElement
    expect(row).toContainElement(screen.getByRole('button', { name: 'Following up' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Start call' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Recap message' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Clean up action items' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Follow-up message' }))
    expect(screen.queryByLabelText('Call status')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(continueButton)
    expect(onContinue).toHaveBeenCalled()
  })
})
