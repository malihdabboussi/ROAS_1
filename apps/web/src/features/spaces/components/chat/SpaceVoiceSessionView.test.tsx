import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceVoiceMiniPlayer, SpaceVoiceSessionView } from './SpaceVoiceSessionView'

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="voice-orb" />,
}))

vi.mock('@/features/studio/components/chat/StatusIndicator', () => ({
  StatusIndicator: () => <div data-testid="status-indicator" />,
}))

vi.mock('@/components/chat/MessageBubbleAdapter', () => ({
  MessageBubble: () => <div data-testid="message-bubble" />,
}))

const emptyTurns = { leadingMessages: [], turns: [] }
const levelRef = { current: 0 }

afterEach(cleanup)

describe('SpaceVoiceSessionView', () => {
  it('centers the live transcript and exposes minimize', () => {
    const onMinimize = vi.fn()
    render(
      <SpaceVoiceSessionView
        agentName="Pixel"
        conversationId="conversation-1"
        state="listening"
        turnData={emptyTurns}
        micInputLevelRef={levelRef}
        audioLevelRef={levelRef}
        error={null}
        isMuted={false}
        onReconnect={vi.fn()}
        onToggleMute={vi.fn()}
        onEnd={vi.fn()}
        onMinimize={onMinimize}
      />,
    )

    expect(screen.getByText('Live transcript').parentElement).toHaveClass('mx-auto', 'max-w-3xl')
    fireEvent.click(screen.getByRole('button', { name: 'Minimize voice session' }))
    expect(onMinimize).toHaveBeenCalledTimes(1)
  })

  it('restores, mutes, and ends from the floating mini player', () => {
    const onRestore = vi.fn()
    const onToggleMute = vi.fn()
    const onEnd = vi.fn()
    render(
      <SpaceVoiceMiniPlayer
        agentName="Pixel"
        state="listening"
        isMuted={false}
        onRestore={onRestore}
        onToggleMute={onToggleMute}
        onEnd={onEnd}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Restore voice session' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }))
    fireEvent.click(screen.getByRole('button', { name: 'End voice session' }))
    expect(onRestore).toHaveBeenCalledTimes(1)
    expect(onToggleMute).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })
})
