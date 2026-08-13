import type { HTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceChatHeaderActions } from './SpaceChatHeaderActions'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      animate: _animate,
      initial: _initial,
      transition: _transition,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      animate?: unknown
      initial?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

afterEach(() => {
  cleanup()
})

describe('SpaceChatHeaderActions', () => {
  it('delegates core header actions', () => {
    const onCollapse = vi.fn()
    const onSearchOpen = vi.fn()
    const onNewConversation = vi.fn()
    const onShowVoiceRuns = vi.fn()
    const onShowConversations = vi.fn()

    render(
      <SpaceChatHeaderActions
        searchOpen={false}
        searchQuery=""
        voiceActive={false}
        hasVoiceTasks
        hasRunningVoiceTasks
        onCollapse={onCollapse}
        onSearchOpen={onSearchOpen}
        onSearchClose={vi.fn()}
        onSearchQueryChange={vi.fn()}
        onNewConversation={onNewConversation}
        onShowVoiceRuns={onShowVoiceRuns}
        onShowConversations={onShowConversations}
      />,
    )

    fireEvent.click(screen.getByLabelText('Collapse Pixel chat'))
    fireEvent.click(screen.getByLabelText('Search in conversation'))
    fireEvent.click(screen.getByLabelText('New conversation'))
    fireEvent.click(screen.getByLabelText('Show tasks and runs'))
    fireEvent.click(screen.getByLabelText('Show conversations'))

    expect(onCollapse).toHaveBeenCalledTimes(1)
    expect(onSearchOpen).toHaveBeenCalledTimes(1)
    expect(onNewConversation).toHaveBeenCalledTimes(1)
    expect(onShowVoiceRuns).toHaveBeenCalledTimes(1)
    expect(onShowConversations).toHaveBeenCalledTimes(1)
  })

  it('renders search controls and closes/clears the query', () => {
    const onSearchClose = vi.fn()
    const onSearchQueryChange = vi.fn()

    render(
      <SpaceChatHeaderActions
        searchOpen
        searchQuery="launch"
        voiceActive={false}
        hasVoiceTasks={false}
        hasRunningVoiceTasks={false}
        onCollapse={vi.fn()}
        onSearchOpen={vi.fn()}
        onSearchClose={onSearchClose}
        onSearchQueryChange={onSearchQueryChange}
        onNewConversation={vi.fn()}
        onShowVoiceRuns={vi.fn()}
        onShowConversations={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'launch plan' } })
    fireEvent.click(screen.getByLabelText('Close search'))

    expect(onSearchQueryChange).toHaveBeenCalledWith('launch plan')
    expect(onSearchClose).toHaveBeenCalledTimes(1)
  })

  it('omits the chat close control in full-page shell chrome', () => {
    const onToggleSummary = vi.fn()

    render(
      <SpaceChatHeaderActions
        searchOpen={false}
        searchQuery=""
        voiceActive={false}
        hasVoiceTasks={false}
        hasRunningVoiceTasks={false}
        onCollapse={vi.fn()}
        onSearchOpen={vi.fn()}
        onSearchClose={vi.fn()}
        onSearchQueryChange={vi.fn()}
        onNewConversation={vi.fn()}
        onShowVoiceRuns={vi.fn()}
        onShowConversations={vi.fn()}
        hideHistoryChrome
        summaryOpen={false}
        onToggleSummary={onToggleSummary}
        conversationDetails={<button type="button">Conversation details</button>}
      />,
    )

    const details = screen.getByRole('button', { name: 'Conversation details' })
    const summary = screen.getByRole('button', { name: 'Summary panel' })
    expect(details.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Summary panel' }))

    expect(onToggleSummary).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Close AI Chats' })).toBeNull()
    expect(screen.queryByLabelText('Collapse Pixel chat')).not.toBeInTheDocument()
  })
})
