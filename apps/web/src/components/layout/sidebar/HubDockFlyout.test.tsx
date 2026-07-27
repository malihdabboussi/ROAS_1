import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HUB_DOCK_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { HubDockFlyout } from './HubDockFlyout'

describe('HubDockFlyout', () => {
  const anchor = {
    top: 40,
    left: 0,
    right: 64,
    bottom: 72,
    width: 64,
    height: 32,
    x: 0,
    y: 40,
    toJSON: () => ({}),
  } as DOMRect

  it('does not close when mousedown lands on a portaled hub-dock menu', () => {
    const onClose = vi.fn()

    render(
      <>
        <HubDockFlyout
          anchor={anchor}
          title="Brain"
          onClose={onClose}
          onEnter={() => {}}
          onLeave={() => {}}
        >
          <p>Flyout body</p>
        </HubDockFlyout>
        <div {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}>
          <button type="button">New tab</button>
        </div>
      </>,
    )

    expect(screen.getByText('Brain')).toBeTruthy()
    fireEvent.mouseDown(screen.getByRole('button', { name: 'New tab' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('anchors primary flyouts below the top bar with full-height panel chrome', () => {
    render(
      <HubDockFlyout
        anchor={anchor}
        title="Programs"
        onClose={() => {}}
        onEnter={() => {}}
        onLeave={() => {}}
      >
        <p>Flyout body</p>
      </HubDockFlyout>,
    )

    const flyout = screen.getByText('Programs').closest('[data-hub-dock-flyout]')
    expect(flyout?.classList.contains('hub-dock-flyout-viewport')).toBe(true)
  })

  it('keeps nested flyouts aligned to their parent row', () => {
    render(
      <HubDockFlyout
        anchor={anchor}
        title="Nested"
        nested
        onClose={() => {}}
        onEnter={() => {}}
        onLeave={() => {}}
      >
        <p>Flyout body</p>
      </HubDockFlyout>,
    )

    const flyout = screen.getByText('Nested').closest('[data-hub-dock-flyout]')
    expect(flyout?.classList.contains('hub-dock-flyout-viewport')).toBe(false)
  })

  it('keeps compact primary flyouts natural-height and aligned to their trigger', () => {
    render(
      <HubDockFlyout
        anchor={anchor}
        title="More"
        compact
        onClose={() => {}}
        onEnter={() => {}}
        onLeave={() => {}}
      >
        <p>Flyout body</p>
      </HubDockFlyout>,
    )

    const flyout = screen.getByText('More').closest('[data-hub-dock-flyout]')
    expect(flyout).not.toHaveClass('hub-dock-flyout-viewport')
    expect(flyout).toHaveStyle({ top: '40px' })
  })

  it('closes when mousedown lands outside the flyout and portaled menus', () => {
    const onClose = vi.fn()

    render(
      <>
        <HubDockFlyout
          anchor={anchor}
          title="Brain"
          onClose={onClose}
          onEnter={() => {}}
          onLeave={() => {}}
        >
          <p>Flyout body</p>
        </HubDockFlyout>
        <button type="button">Outside</button>
      </>,
    )

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('lets another rail trigger replace the current flyout without closing it first', () => {
    const onClose = vi.fn()

    render(
      <>
        <button type="button" data-hub-rail-trigger="more">
          More
        </button>
        <HubDockFlyout
          anchor={anchor}
          title="Brain"
          onClose={onClose}
          onEnter={() => {}}
          onLeave={() => {}}
        >
          <p>Flyout body</p>
        </HubDockFlyout>
      </>,
    )

    fireEvent.mouseDown(screen.getByRole('button', { name: 'More' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not close when mousedown lands on a dialog opened from the flyout', () => {
    const onClose = vi.fn()

    render(
      <>
        <HubDockFlyout
          anchor={anchor}
          title="Team"
          onClose={onClose}
          onEnter={() => {}}
          onLeave={() => {}}
        >
          <p>Flyout body</p>
        </HubDockFlyout>
        <div role="dialog">
          <button type="button">Save settings</button>
        </div>
      </>,
    )

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Save settings' }))
    expect(onClose).not.toHaveBeenCalled()
  })
})
