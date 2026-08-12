import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DraftVersionsCard } from './DraftVersionsCard'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const VERSIONS = [
  { label: 'Full breakdown', text: 'Full body' },
  { label: 'Short version', text: 'Short body' },
]

describe('DraftVersionsCard', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('edits live in place with no save controls', () => {
    render(<DraftVersionsCard versions={VERSIONS} />)

    const body = screen.getByRole('textbox', { name: 'Draft: Full breakdown' })
    expect(body.getAttribute('contenteditable')).toBe('true')
    // No edit-mode chrome — keystrokes just persist.
    expect(screen.queryByText('Save')).toBeNull()
    expect(screen.queryByText('Cancel')).toBeNull()
    expect(screen.queryByText('Reset')).toBeNull()

    body.textContent = 'Full body, tightened'
    fireEvent.input(body)
    expect(screen.getByText('Edited')).toBeTruthy()
  })

  it('keeps per-version edits when switching tabs and sends the edited text to the composer', () => {
    const events: string[] = []
    const onUse = (event: Event) => {
      events.push((event as CustomEvent<{ text: string }>).detail.text)
    }
    window.addEventListener('chat:draft-card-use', onUse)
    try {
      render(<DraftVersionsCard versions={VERSIONS} />)

      const body = screen.getByRole('textbox', { name: 'Draft: Full breakdown' })
      body.textContent = 'Full body, edited'
      fireEvent.input(body)

      // Switch away and back — the edit survives.
      fireEvent.click(screen.getByText('Short version'))
      expect(screen.getByRole('textbox', { name: 'Draft: Short version' }).textContent).toBe(
        'Short body',
      )
      fireEvent.click(screen.getByText('Full breakdown'))
      expect(screen.getByRole('textbox', { name: 'Draft: Full breakdown' }).textContent).toBe(
        'Full body, edited',
      )

      fireEvent.click(screen.getByLabelText('Use draft in composer: Full breakdown'))
      expect(events).toEqual(['Full body, edited'])
    } finally {
      window.removeEventListener('chat:draft-card-use', onUse)
    }
  })

  it('renders no Slack send affordance', () => {
    render(<DraftVersionsCard versions={VERSIONS} />)
    expect(screen.queryByLabelText(/Send draft to Slack/)).toBeNull()
    expect(screen.queryByTitle(/Send to Slack/)).toBeNull()
  })
})
