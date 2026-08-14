import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceChatPanelHeader } from './SpaceChatPanelHeader'

describe('SpaceChatPanelHeader', () => {
  afterEach(cleanup)

  it('pins full-layout conversation controls to the top-right of the chat pane', () => {
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
    expect(screen.getByRole('button', { name: 'Rename conversation' })).toBeInTheDocument()
    const details = screen.getByRole('button', { name: 'Conversation details' })
    const controls = screen.getByRole('button', { name: 'Conversation controls' })

    expect(details.parentElement).toBe(controls.parentElement)
    expect(controls.parentElement).toHaveClass('absolute', 'right-spacing-3', 'top-spacing-2')
    expect(
      details.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('keeps compact-layout controls inline', () => {
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

    expect(
      screen.getByRole('button', { name: 'Conversation controls' }).parentElement,
    ).not.toHaveClass('absolute')
  })
})
