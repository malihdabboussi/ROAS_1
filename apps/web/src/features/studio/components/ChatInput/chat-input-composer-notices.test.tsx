import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ChatInputCreditsExhaustedNotice,
  ChatInputDragOverlay,
} from './chat-input-composer-notices'

afterEach(cleanup)

describe('chat input composer notices', () => {
  it('dispatches the credit purchase event from the exhausted notice', () => {
    const listener = vi.fn()
    window.addEventListener('open-credit-purchase', listener)

    render(<ChatInputCreditsExhaustedNotice composerPadX="px-spacing-4" />)
    fireEvent.click(screen.getByRole('button', { name: 'buy more' }))

    expect(screen.getByText(/run out of credits/i).className).toContain('text-destructive')
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('open-credit-purchase', listener)
  })

  it('renders drag overlay with token utility classes and optional rounding', () => {
    const { container, rerender } = render(
      <ChatInputDragOverlay roundedClass="rounded-spacing-4" />,
    )

    expect(screen.getByText('Drop your file')).toBeTruthy()
    expect(container.firstElementChild?.className).toContain('bg-background/80')
    expect(container.firstElementChild?.className).toContain('border-primary')
    expect(container.firstElementChild?.className).toContain('rounded-spacing-4')
    expect(container.firstElementChild?.className).not.toContain('[var(')

    rerender(<ChatInputDragOverlay wrapperClass="input-glass" roundedClass="rounded-spacing-4" />)
    expect(container.firstElementChild?.className).not.toContain('rounded-spacing-4')
  })
})
