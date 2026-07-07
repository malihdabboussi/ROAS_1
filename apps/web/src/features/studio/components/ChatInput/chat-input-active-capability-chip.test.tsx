import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputActiveCapabilityChip } from './chat-input-active-capability-chip'

vi.mock('@/components/ui/IconPicker', () => ({
  LucideIcon: ({ name, className }: { name: string; className?: string }) => (
    <span className={className} data-testid={`icon-${name}`} />
  ),
}))

afterEach(cleanup)

describe('ChatInputActiveCapabilityChip', () => {
  it('renders the selected capability and delegates clear', () => {
    const onClear = vi.fn()
    render(
      <ChatInputActiveCapabilityChip
        chip={{ label: 'Research web', icon: 'search' }}
        onClear={onClear}
      />,
    )

    expect(screen.getByText('Research web').className).toContain('max-w-32')
    expect(screen.getByTestId('icon-search')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear selected capability' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('renders nothing without a selected capability', () => {
    const { container } = render(<ChatInputActiveCapabilityChip chip={null} onClear={vi.fn()} />)

    expect(container.textContent).toBe('')
  })
})
