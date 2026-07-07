import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ComposerActiveRunTipCard } from './ComposerActiveRunTipCard'

describe('ComposerActiveRunTipCard', () => {
  it('renders nothing without an active stream', () => {
    const { container } = render(
      <ComposerActiveRunTipCard conversationId="conversation-1" isStreaming={false} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders tip chrome while a conversation is streaming', () => {
    render(<ComposerActiveRunTipCard conversationId="conversation-1" isStreaming />)

    expect(screen.queryByText('Tip:')).not.toBeNull()
  })
})
