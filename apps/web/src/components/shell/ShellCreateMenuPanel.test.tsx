import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShellCreateMenuPanel } from './ShellCreateMenuPanel'

afterEach(cleanup)

describe('ShellCreateMenuPanel', () => {
  it('drills into Mission playbooks without closing the Create selector', () => {
    const onCloseMenu = vi.fn()
    const onSelectMissionPlaybook = vi.fn()

    render(
      <ShellCreateMenuPanel
        onSelectCreateItem={vi.fn()}
        onSelectMissionPlaybook={onSelectMissionPlaybook}
        onCloseMenu={onCloseMenu}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Mission/i }))

    expect(onCloseMenu).not.toHaveBeenCalled()
    expect(screen.getByText('Client Strategy')).toBeInTheDocument()
    expect(screen.getByText('Meta Ads Audit')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Client Strategy/i }))

    expect(onSelectMissionPlaybook).toHaveBeenCalledWith('client-strategy')
    expect(onCloseMenu).toHaveBeenCalledOnce()
  })

  it('keeps the More catalog in its own in-selector submenu', () => {
    const onSelectCreateItem = vi.fn()
    const onCloseMenu = vi.fn()

    render(
      <ShellCreateMenuPanel
        onSelectCreateItem={onSelectCreateItem}
        onSelectMissionPlaybook={vi.fn()}
        onCloseMenu={onCloseMenu}
      />,
    )

    expect(screen.queryByText('Website')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /More/i }))
    expect(screen.getByText('Website')).toBeInTheDocument()
    expect(screen.getByText('Social Post')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByText('Website')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /More/i }))
    fireEvent.click(screen.getByRole('button', { name: /Website/i }))

    expect(onSelectCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'create-website' }),
    )
    expect(onCloseMenu).toHaveBeenCalledOnce()
  })

  it('starts Client Lifecycle directly from Create More through the shared Mission launcher', () => {
    const onCloseMenu = vi.fn()
    const onSelectMissionPlaybook = vi.fn()

    render(
      <ShellCreateMenuPanel
        onSelectCreateItem={vi.fn()}
        onSelectMissionPlaybook={onSelectMissionPlaybook}
        onCloseMenu={onCloseMenu}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /More/i }))
    fireEvent.click(screen.getByRole('button', { name: /Client Lifecycle/i }))

    expect(onSelectMissionPlaybook).toHaveBeenCalledWith('client-lifecycle')
    expect(onCloseMenu).toHaveBeenCalledOnce()
  })
})
