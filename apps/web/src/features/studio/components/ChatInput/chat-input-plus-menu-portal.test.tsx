import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputPlusMenuPortal } from './chat-input-plus-menu-portal'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function defaultProps(overrides: Partial<Parameters<typeof ChatInputPlusMenuPortal>[0]> = {}) {
  const portalTarget = document.createElement('div')
  document.body.appendChild(portalTarget)

  return {
    open: true,
    portalTarget,
    menuPosition: { top: 10, left: 20 },
    submenu: null,
    submenuPosition: { top: 30, left: 40 },
    infoCard: null,
    connectedProviders: [],
    suggestedUnconnected: [],
    agentToggles: [],
    allSlashItems: [],
    skillDenyKeys: new Set<string>(),
    skillTogglePending: null,
    composerPolicy: null,
    composerPolicyLoading: false,
    composerPolicyPending: null,
    accessReadOnly: false,
    onSubmenuAnchorNode: vi.fn(),
    onOpenSubmenu: vi.fn(),
    onCancelSubmenuClose: vi.fn(),
    onScheduleSubmenuClose: vi.fn(),
    onLocalUpload: vi.fn(),
    onDrive: vi.fn(),
    onDropbox: vi.fn(),
    onGenerateImage: vi.fn(),
    onCloseMenu: vi.fn(),
    onOpenAtMenu: vi.fn(),
    onToggleAgent: vi.fn(),
    onConnectIntegration: vi.fn(),
    onToggleSkill: vi.fn(),
    onToggleAccess: vi.fn(),
    onShowInfoCard: vi.fn(),
    onClearInfoCard: vi.fn(),
    ...overrides,
  }
}

describe('ChatInputPlusMenuPortal', () => {
  it('does not render while closed', () => {
    const props = defaultProps({ open: false })

    render(<ChatInputPlusMenuPortal {...props} />)

    expect((props.portalTarget as HTMLElement).textContent).toBe('')
  })

  it('renders the menu view into the portal target with the existing menu position', () => {
    const props = defaultProps()

    render(<ChatInputPlusMenuPortal {...props} />)

    const menu = (props.portalTarget as HTMLElement).querySelector(
      '.dropdown-menu-solid',
    ) as HTMLElement | null
    expect(menu).toBeTruthy()
    expect(menu?.style.top).toBe('10px')
    expect(menu?.style.left).toBe('20px')
    expect(screen.getByText('Add photos & files')).toBeTruthy()
  })

  it('delegates submenu actions and keeps mouse events inside the portal', () => {
    const onContainerMouseDown = vi.fn()
    const onCloseMenu = vi.fn()
    const onOpenAtMenu = vi.fn()
    const props = defaultProps({ submenu: 'attach', onCloseMenu, onOpenAtMenu })

    render(
      <div onMouseDown={onContainerMouseDown}>
        <ChatInputPlusMenuPortal {...props} />
      </div>,
    )

    fireEvent.mouseDown((props.portalTarget as HTMLElement).querySelector('.dropdown-menu-solid')!)
    expect(onContainerMouseDown).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Media' }))
    expect(onCloseMenu).toHaveBeenCalledTimes(1)
    expect(onOpenAtMenu).toHaveBeenCalledWith('media')
  })
})
