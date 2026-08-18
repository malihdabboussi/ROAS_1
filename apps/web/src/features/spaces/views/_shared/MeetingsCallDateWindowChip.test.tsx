import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MEETINGS_TOOLBAR_MESSAGES } from '@/features/spaces/config/meetings-toolbar-messages.config'
import type { ViewDef } from '@/features/spaces/types/space-schema'
import { MeetingsCallDateWindowChip } from './MeetingsCallDateWindowChip'

function view(overrides?: Partial<ViewDef>): ViewDef {
  return {
    id: 'all-meetings',
    name: 'All Meetings',
    type: 'table',
    ...overrides,
  } as ViewDef
}

describe('MeetingsCallDateWindowChip', () => {
  it('clears the default past-through-tomorrow window', () => {
    const onPatch = vi.fn()
    render(<MeetingsCallDateWindowChip view={view()} onPatch={onPatch} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: MEETINGS_TOOLBAR_MESSAGES.CALL_DATE_WINDOW_CLEAR.message,
      }),
    )
    expect(onPatch).toHaveBeenCalledWith({ toolbar_call_date_window: 'all' })
  })

  it('restores the window after it is cleared', () => {
    const onPatch = vi.fn()
    render(
      <MeetingsCallDateWindowChip
        view={view({ toolbar_call_date_window: 'all' })}
        onPatch={onPatch}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: MEETINGS_TOOLBAR_MESSAGES.CALL_DATE_WINDOW_RESTORE.message,
      }),
    )
    expect(onPatch).toHaveBeenCalledWith({ toolbar_call_date_window: 'past_through_tomorrow' })
  })

  it('hides on other views', () => {
    const onPatch = vi.fn()
    const { container } = render(
      <MeetingsCallDateWindowChip view={view({ id: 'follow-ups' })} onPatch={onPatch} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
