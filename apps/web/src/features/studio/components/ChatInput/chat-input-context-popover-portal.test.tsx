import type { ContextBreakdown } from '@vibey/context-breakdown'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputContextPopoverPortal } from './chat-input-context-popover-portal'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const breakdown: ContextBreakdown = {
  version: 1,
  source: 'estimate',
  generatedAt: 1,
  totalTokens: 25_000,
  contextWindow: 100_000,
  slices: [
    {
      id: 'conversation',
      label: 'Conversation',
      tokens: 25_000,
      entries: [{ id: 'msg-1', label: 'Message', tokens: 25_000 }],
    },
  ],
}

describe('ChatInputContextPopoverPortal', () => {
  it('does not render without a measured position', () => {
    const portalTarget = document.createElement('div')
    document.body.appendChild(portalTarget)

    render(
      <ChatInputContextPopoverPortal
        open
        panelRef={vi.fn()}
        position={null}
        portalTarget={portalTarget}
        breakdown={breakdown}
      />,
    )

    expect(portalTarget.textContent).toBe('')
  })

  it('renders the positioned popover into the provided portal target', () => {
    const portalTarget = document.createElement('div')
    document.body.appendChild(portalTarget)

    render(
      <ChatInputContextPopoverPortal
        open
        panelRef={vi.fn()}
        position={{ left: 16, bottom: 48, width: 320 }}
        portalTarget={portalTarget}
        breakdown={breakdown}
      />,
    )

    const panel = portalTarget.querySelector('.z-dropdown') as HTMLElement | null
    expect(panel).toBeTruthy()
    expect(panel?.style.left).toBe('16px')
    expect(panel?.style.bottom).toBe('48px')
    expect(panel?.style.width).toBe('320px')
    expect(screen.getByText('Context')).toBeTruthy()
    expect(screen.getByText('25k / 100k tokens')).toBeTruthy()
  })

  it('keeps mouse events inside the portal shell', () => {
    const portalTarget = document.createElement('div')
    document.body.appendChild(portalTarget)
    const onContainerMouseDown = vi.fn()

    render(
      <div onMouseDown={onContainerMouseDown}>
        <ChatInputContextPopoverPortal
          open
          panelRef={vi.fn()}
          position={{ left: 16, bottom: 48, width: 320 }}
          portalTarget={portalTarget}
          breakdown={breakdown}
        />
      </div>,
    )

    fireEvent.mouseDown(portalTarget.querySelector('.z-dropdown')!)
    expect(onContainerMouseDown).not.toHaveBeenCalled()
  })
})
