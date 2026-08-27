import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FieldDef } from '@/lib/spaces/space-schema-types'
import { MeetingCallStatusSection } from './MeetingCallStatusSection'

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

describe('MeetingCallStatusSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('puts Continue in chat, Call status, and recap actions on one row', () => {
    const onContinue = vi.fn()
    render(
      <MeetingCallStatusSection
        statusField={statusField}
        statusValue="completed"
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
    expect(row).toContainElement(screen.getByRole('button', { name: 'Completed' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Start call' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Run post-call flow' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Clean up action items' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Follow-up message' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Delegate remaining work' }))
    expect(screen.queryByLabelText('Call status')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(continueButton)
    expect(onContinue).toHaveBeenCalled()
  })
})
