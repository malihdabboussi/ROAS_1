import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceChatPanelHeader } from './SpaceChatPanelHeader'

describe('SpaceChatPanelHeader', () => {
  afterEach(cleanup)

  it('keeps conversation controls in the header bar with the title', () => {
    render(
      <SpaceChatPanelHeader
        layout="full"
        agentPicker={<span>Pixel</span>}
        conversationDetails={<button type="button">Conversation details</button>}
        title="Launch plan"
        conversationId="conversation-1"
        renameRequestNonce={0}
        onRename={vi.fn()}
        actions={<button type="button">Conversation controls</button>}
      />,
    )

    expect(screen.getByText('Pixel')).toBeInTheDocument()
    const rename = screen.getByRole('button', { name: 'Rename conversation' })
    const details = screen.getByRole('button', { name: 'Conversation details' })
    const controls = screen.getByRole('button', { name: 'Conversation controls' })
    const header = controls.closest('header')

    expect(header).toHaveClass('border-b')
    expect(header).toContainElement(rename)
    expect(header).toContainElement(controls)
    expect(details.parentElement).not.toBe(controls.parentElement)
    expect(controls.parentElement).toHaveClass('flex', 'shrink-0')
    expect(controls.parentElement).not.toHaveClass('absolute')
  })

  it('keeps compact-layout controls in the same header bar', () => {
    render(
      <SpaceChatPanelHeader
        layout="compact"
        agentPicker={null}
        title=""
        conversationId={null}
        renameRequestNonce={0}
        onRename={vi.fn()}
        actions={<button type="button">Conversation controls</button>}
      />,
    )

    const controls = screen.getByRole('button', { name: 'Conversation controls' })
    expect(controls.closest('header')).toHaveClass('border-b')
    expect(controls.parentElement).not.toHaveClass('absolute')
  })
})
