import type { HTMLAttributes, ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChatPanelSlideStack } from './ChatPanelSlideStack'

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      animate: _animate,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      animate?: unknown
      exit?: unknown
      initial?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

afterEach(() => {
  cleanup()
})

describe('ChatPanelSlideStack', () => {
  it('keeps only the chat panel rendered for chat mode', () => {
    render(
      <ChatPanelSlideStack
        panelKey="chat"
        chatPanel={<div data-testid="chat-panel">Chat</div>}
        subPanel={<div data-testid="sub-panel">Sub panel</div>}
      />,
    )

    const chatShell = screen.getByTestId('chat-panel').parentElement
    expect(chatShell?.getAttribute('aria-hidden')).toBe('false')
    expect(screen.queryByTestId('sub-panel')).toBeNull()
  })

  it('keeps chat mounted behind the active subpanel', () => {
    render(
      <ChatPanelSlideStack
        panelKey="conversations"
        chatPanel={<div data-testid="chat-panel">Chat</div>}
        subPanel={<div data-testid="sub-panel">Sub panel</div>}
      />,
    )

    const chatShell = screen.getByTestId('chat-panel').parentElement
    expect(chatShell?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByTestId('sub-panel').textContent).toBe('Sub panel')
  })
})
