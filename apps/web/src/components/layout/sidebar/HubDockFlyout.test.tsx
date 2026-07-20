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
