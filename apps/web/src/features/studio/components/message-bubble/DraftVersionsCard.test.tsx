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

  it('preserves newlines from browser line-break markup in the composer dispatch and copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const events: string[] = []
    const onUse = (event: Event) => {
      events.push((event as CustomEvent<{ text: string }>).detail.text)
    }
    window.addEventListener('chat:draft-card-use', onUse)
    try {
      render(<DraftVersionsCard versions={VERSIONS} />)

      const body = screen.getByRole('textbox', { name: 'Draft: Full breakdown' })
      // Chrome represents Enter as block children; Firefox as <br>. Both must
      // read back as \n instead of silently collapsing into one line.
      body.innerHTML = 'line one<div>line two</div><div>line three</div>'
      fireEvent.input(body)

      fireEvent.click(screen.getByLabelText('Use draft in composer: Full breakdown'))
      expect(events).toEqual(['line one\nline two\nline three'])

      fireEvent.click(screen.getByLabelText('Copy draft: Full breakdown'))
      await vi.waitFor(() =>
        expect(writeText).toHaveBeenCalledWith('line one\nline two\nline three'),
      )

      body.innerHTML = 'first<br>second<div><br></div><div>after blank</div>'
      fireEvent.input(body)
      fireEvent.click(screen.getByLabelText('Use draft in composer: Full breakdown'))
      expect(events[1]).toBe('first\nsecond\n\nafter blank')
    } finally {
      window.removeEventListener('chat:draft-card-use', onUse)
    }
  })

  it('pastes as plain text, ignoring rich HTML from the clipboard', () => {
    const events: string[] = []
    const onUse = (event: Event) => {
      events.push((event as CustomEvent<{ text: string }>).detail.text)
    }
    window.addEventListener('chat:draft-card-use', onUse)
    try {
      render(<DraftVersionsCard versions={VERSIONS} />)

      const body = screen.getByRole('textbox', { name: 'Draft: Full breakdown' })
      const range = document.createRange()
      range.selectNodeContents(body)
      range.collapse(false)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)

      fireEvent.paste(body, {
        clipboardData: {
          getData: (type: string) =>
            type === 'text/plain' ? ' pasted line' : '<b> pasted line</b>',
        },
      })

      expect(body.querySelector('b')).toBeNull()
      expect(body.textContent).toBe('Full body pasted line')
      expect(screen.getByText('Edited')).toBeTruthy()

      fireEvent.click(screen.getByLabelText('Use draft in composer: Full breakdown'))
      expect(events).toEqual(['Full body pasted line'])
    } finally {
      window.removeEventListener('chat:draft-card-use', onUse)
    }
  })

  it('reset restores the original draft and clears the Edited pill', () => {
    const events: string[] = []
    const onUse = (event: Event) => {
      events.push((event as CustomEvent<{ text: string }>).detail.text)
    }
    window.addEventListener('chat:draft-card-use', onUse)
    try {
      render(<DraftVersionsCard versions={VERSIONS} />)

      // No reset affordance while the draft is pristine.
      expect(screen.queryByLabelText('Reset draft: Full breakdown')).toBeNull()

      const body = screen.getByRole('textbox', { name: 'Draft: Full breakdown' })
      body.textContent = 'Full body, mangled'
      fireEvent.input(body)
      expect(screen.getByText('Edited')).toBeTruthy()

      fireEvent.click(screen.getByLabelText('Reset draft: Full breakdown'))

      expect(screen.queryByText('Edited')).toBeNull()
      expect(screen.queryByLabelText('Reset draft: Full breakdown')).toBeNull()
      expect(screen.getByRole('textbox', { name: 'Draft: Full breakdown' }).textContent).toBe(
        'Full body',
      )
      fireEvent.click(screen.getByLabelText('Use draft in composer: Full breakdown'))
      expect(events).toEqual(['Full body'])
    } finally {
      window.removeEventListener('chat:draft-card-use', onUse)
    }
  })
})
