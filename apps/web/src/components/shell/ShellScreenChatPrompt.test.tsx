import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ShellScreenChatPrompt } from './ShellScreenChatPrompt'
import { useShellStore } from './use-shell-store'

describe('ShellScreenChatPrompt', () => {
  beforeEach(() => {
    useShellStore.setState({
      chatDrawer: { open: true, conversationId: 'conv-current', width: 420, minimized: false },
      lastConversationByScreen: { 'home:inbox': 'conv-inbox' },
      screenChatPrompt: {
        screenKey: 'home:inbox',
        screenLabel: 'Inbox',
        conversationId: 'conv-inbox',
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders nothing without a pending prompt', () => {
    useShellStore.setState({ screenChatPrompt: null })
    const { container } = render(<ShellScreenChatPrompt />)
    expect(container).toBeEmptyDOMElement()
  })

  it('offers to switch to the screen’s last chat', () => {
    render(<ShellScreenChatPrompt />)
    expect(screen.getByText('Switch to your last Inbox chat?')).toBeInTheDocument()
  })

  it('switches to the offered conversation on accept', () => {
    render(<ShellScreenChatPrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Open your last Inbox chat' }))

    expect(useShellStore.getState().chatDrawer.conversationId).toBe('conv-inbox')
    expect(useShellStore.getState().screenChatPrompt).toBeNull()
  })

  it('keeps the current chat on dismiss', () => {
    render(<ShellScreenChatPrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss chat switch suggestion' }))

    expect(useShellStore.getState().chatDrawer.conversationId).toBe('conv-current')
    expect(useShellStore.getState().screenChatPrompt).toBeNull()
  })
})
