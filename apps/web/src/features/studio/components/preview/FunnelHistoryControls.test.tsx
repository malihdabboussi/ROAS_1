import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FunnelHistoryControls } from './FunnelHistoryControls'

describe('FunnelHistoryControls', () => {
  it('disables unavailable directions and delegates available clicks', () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()

    render(
      <FunnelHistoryControls
        canUndo={false}
        canRedo={true}
        isLoading={false}
        onUndo={onUndo}
        onRedo={onRedo}
      />,
    )

    expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(onUndo).not.toHaveBeenCalled()
    expect(onRedo).toHaveBeenCalledTimes(1)
  })
})
