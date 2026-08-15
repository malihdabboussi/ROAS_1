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
    const rename = screen.getByRole('button', { name: 'Rename conversation' })
    const details = screen.getByRole('button', { name: 'Conversation details' })
    const controls = screen.getByRole('button', { name: 'Conversation controls' })

    // Three-dots menu sits inline next to the agent name, before the title;
    // only the action cluster is pinned to the top-right of the pane.
    expect(details.parentElement).not.toBe(controls.parentElement)
    expect(details.compareDocumentPosition(rename) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(controls.parentElement).toHaveClass('absolute', 'right-spacing-3', 'top-spacing-2')
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
