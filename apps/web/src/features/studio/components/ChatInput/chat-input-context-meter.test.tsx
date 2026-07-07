import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputContextMeter, getContextMeterRingState } from './chat-input-context-meter'

afterEach(cleanup)

describe('ChatInputContextMeter', () => {
  it('computes token labels and tokenized ring colors by usage threshold', () => {
    expect(getContextMeterRingState({ totalTokens: 25_000, contextWindow: 100_000 })).toMatchObject(
      {
        remainPct: 75,
        stroke: 'var(--color-success)',
        label: 'Context: 25k / 100k (75% remaining)',
      },
    )
    expect(getContextMeterRingState({ totalTokens: 60_000, contextWindow: 100_000 })).toMatchObject(
      {
        remainPct: 40,
        stroke: 'var(--color-warning)',
      },
    )
    expect(getContextMeterRingState({ totalTokens: 90_000, contextWindow: 100_000 })).toMatchObject(
      {
        remainPct: 10,
        stroke: 'var(--color-destructive)',
      },
    )
  })

  it('renders a non-button meter when the breakdown panel is disabled', () => {
    const { container } = render(
      <ChatInputContextMeter
        meter={{ totalTokens: 25_000, contextWindow: 100_000 }}
        breakdownPanelEnabled={false}
        popoverOpen={false}
        anchorRef={createRef()}
        triggerRef={createRef()}
        onOpenBeforeToggle={vi.fn()}
        onToggle={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Open context breakdown' })).toBeNull()
    const progressCircle = container.querySelectorAll('circle')[1]
    expect(progressCircle?.getAttribute('stroke')).toBe('var(--color-success)')
  })

  it('delegates popover positioning before opening and toggles expanded state', () => {
    const onOpenBeforeToggle = vi.fn()
    const onToggle = vi.fn()
    const { rerender } = render(
      <ChatInputContextMeter
        meter={{ totalTokens: 60_000, contextWindow: 100_000 }}
        breakdownPanelEnabled
        popoverOpen={false}
        anchorRef={createRef()}
        triggerRef={createRef()}
        onOpenBeforeToggle={onOpenBeforeToggle}
        onToggle={onToggle}
      />,
    )

    const button = screen.getByRole('button', { name: 'Open context breakdown' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(button)
    expect(onOpenBeforeToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledTimes(1)

    rerender(
      <ChatInputContextMeter
        meter={{ totalTokens: 90_000, contextWindow: 100_000 }}
        breakdownPanelEnabled
        popoverOpen
        anchorRef={createRef()}
        triggerRef={createRef()}
        onOpenBeforeToggle={onOpenBeforeToggle}
        onToggle={onToggle}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open context breakdown' }))
    expect(onOpenBeforeToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledTimes(2)
  })
})
