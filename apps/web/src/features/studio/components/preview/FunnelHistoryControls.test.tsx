import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FunnelHistoryControls } from './FunnelHistoryControls'

afterEach(cleanup)

describe('FunnelHistoryControls', () => {
  it('disables unavailable directions and delegates available clicks', () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()

    render(
      <FunnelHistoryControls
        canUndo={false}
        canRedo={true}
        isLoading={false}
        entries={[]}
        historyLoading={false}
        currentChangeSetId={null}
        restoringChangeSetId={null}
        onUndo={onUndo}
        onRedo={onRedo}
        onHistoryOpen={vi.fn()}
        onRestore={vi.fn()}
      />,
    )

    expect(
      (screen.getByRole('button', { name: 'Undo last edit' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Redo last edit' }))
    expect(onUndo).not.toHaveBeenCalled()
    expect(onRedo).toHaveBeenCalledTimes(1)
  })

  it('opens the saved revision timeline and restores an older version', () => {
    const onHistoryOpen = vi.fn()
    const onRestore = vi.fn()

    render(
      <FunnelHistoryControls
        canUndo
        canRedo={false}
        isLoading={false}
        entries={[
          {
            id: 'change-2',
            label: 'Updated styles.css',
            action: 'write_funnel_file',
            source: 'agent',
            status: 'applied',
            created_at: '2026-06-16T12:00:00.000Z',
            updated_at: '2026-06-16T12:00:00.000Z',
          },
          {
            id: 'change-1',
            label: 'Updated index.html',
            action: 'write_funnel_file',
            source: 'studio',
            status: 'applied',
            created_at: '2026-06-16T11:00:00.000Z',
            updated_at: '2026-06-16T11:00:00.000Z',
          },
        ]}
        historyLoading={false}
        currentChangeSetId="change-2"
        restoringChangeSetId={null}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onHistoryOpen={onHistoryOpen}
        onRestore={onRestore}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Version history' }))

    expect(onHistoryOpen).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Updated index.html')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Restore Updated index.html' }))
    expect(onRestore).toHaveBeenCalledWith('change-1')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Version history' })).toBeNull()
  })
})
