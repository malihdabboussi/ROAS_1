import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FathomMeeting } from '../../services/user-brain-import.service'
import { FathomImportModal } from './fathom-import-modal'
import { FirefliesImportModal } from './fireflies-import-modal'

describe('user Brain call import dialogs', () => {
  it('describes the Fireflies import and names its close action', () => {
    render(
      <FirefliesImportModal
        open
        onOpenChange={vi.fn()}
        loadingFireflies={false}
        firefliesTranscripts={[]}
        importingMeetingId={null}
        setImportingMeetingId={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Import Fireflies Calls' }),
    ).toHaveAccessibleDescription('One click import runs crystallization and memory extraction.')
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  it('makes each Fathom meeting keyboard-operable', () => {
    const toggleFathomSelection = vi.fn()
    const meeting = {
      id: 'meeting-1',
      title: 'Customer interview',
      created_at: '2026-07-17T10:00:00.000Z',
    } as FathomMeeting

    render(
      <FathomImportModal
        open
        onOpenChange={vi.fn()}
        loadingFathom={false}
        sortedFathom={[meeting]}
        selectedFathomIds={new Set()}
        setSelectedFathomIds={vi.fn()}
        toggleFathomSelection={toggleFathomSelection}
        getMeetingId={() => meeting.id!}
        fathomNextCursor={undefined}
        loadingMoreFathom={false}
        onLoadMore={vi.fn()}
        onLoadAll={vi.fn()}
        importingBatch={false}
        onBatchImport={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Import Fathom Calls' })).toHaveAccessibleDescription(
      'Select calls to import. Each runs crystallization and memory extraction.',
    )
    fireEvent.click(screen.getByRole('button', { name: /Customer interview/ }))
    expect(toggleFathomSelection).toHaveBeenCalledWith('meeting-1')
  })
})
