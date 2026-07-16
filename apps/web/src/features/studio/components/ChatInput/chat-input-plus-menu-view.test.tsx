import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputPlusMenuView } from './chat-input-plus-menu-view'
import { COMPOSER_ACCESS_ROWS, type ComposerPolicy } from './chat-input-policy'
import type { SlashItem } from './chat-input-slash-menu'

afterEach(cleanup)

function skill(overrides: Partial<SlashItem> = {}): SlashItem {
  return {
    id: 'skill-1',
    key: 'research',
    name: 'Research web',
    description: 'Find current sources.',
    is_enabled: true,
    type: 'skill',
    ...overrides,
  }
}

function renderPlusMenu(overrides: Partial<Parameters<typeof ChatInputPlusMenuView>[0]> = {}) {
  const props: Parameters<typeof ChatInputPlusMenuView>[0] = {
    menuPosition: { top: 10, left: 20 },
    submenu: null,
    submenuPosition: { top: 30, left: 40 },
    infoCard: null,
    connectedProviders: [],
    suggestedUnconnected: [],
    agentToggles: [],
    allSlashItems: [],
    skillDenyKeys: new Set(),
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
  return { props, ...render(<ChatInputPlusMenuView {...props} />) }
}

describe('ChatInputPlusMenuView', () => {
  it('renders Generate image and delegates click through the close path', () => {
    const onCloseMenu = vi.fn()
    const onGenerateImage = vi.fn()
    renderPlusMenu({ onCloseMenu, onGenerateImage })

    expect(screen.getByText('Generate image')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /generate image/i }))

    expect(onCloseMenu).toHaveBeenCalledTimes(1)
    expect(onGenerateImage).toHaveBeenCalledTimes(1)
  })

  it('renders root menu rows and delegates submenu hover behavior', () => {
    const onOpenSubmenu = vi.fn()
    const onSubmenuAnchorNode = vi.fn()
    const { props } = renderPlusMenu({ onOpenSubmenu, onSubmenuAnchorNode })

    expect(screen.getByText('Generate image')).toBeTruthy()
    expect(screen.getByText('Add photos & files')).toBeTruthy()
    expect(screen.getByText('Attach')).toBeTruthy()
    expect(screen.getByText('Access')).toBeTruthy()
    expect(onSubmenuAnchorNode).toHaveBeenCalledWith('files', expect.any(HTMLButtonElement))

    fireEvent.mouseEnter(screen.getByRole('button', { name: /integrations/i }))
    expect(onOpenSubmenu).toHaveBeenCalledWith('integrations')

    vi.mocked(props.onCancelSubmenuClose).mockClear()
    fireEvent.mouseEnter(screen.getByText('Add photos & files').closest('div')!)
    expect(props.onCancelSubmenuClose).toHaveBeenCalledTimes(1)
    fireEvent.mouseLeave(screen.getByText('Add photos & files').closest('div')!)
    expect(props.onScheduleSubmenuClose).toHaveBeenCalledTimes(1)
  })

  it('delegates attach submenu tab selection through the close path', () => {
    const onCloseMenu = vi.fn()
    const onOpenAtMenu = vi.fn()
    renderPlusMenu({ submenu: 'attach', onCloseMenu, onOpenAtMenu })

    fireEvent.click(screen.getByRole('button', { name: 'Media' }))

    expect(onCloseMenu).toHaveBeenCalledTimes(1)
    expect(onOpenAtMenu).toHaveBeenCalledWith('media')
  })

  it('renders integration toggles and connect actions', () => {
    const onToggleAgent = vi.fn()
    const onConnectIntegration = vi.fn()
    renderPlusMenu({
      submenu: 'integrations',
      connectedProviders: ['github'],
      suggestedUnconnected: ['stripe'],
      agentToggles: [
        {
          integration_id: 'github',
          provider: 'github',
          status: 'connected',
          agent_enabled: false,
        },
      ],
      onToggleAgent,
      onConnectIntegration,
    })

    expect(screen.getByText('GitHub')).toBeTruthy()
    fireEvent.click(screen.getByRole('switch'))
    expect(onToggleAgent).toHaveBeenCalledWith('github', true)

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    expect(onConnectIntegration).toHaveBeenCalledWith('stripe')
  })

  it('renders skill switches and delegates hover info cards', () => {
    const onToggleSkill = vi.fn()
    const onShowInfoCard = vi.fn()
    const onClearInfoCard = vi.fn()
    renderPlusMenu({
      submenu: 'skills',
      allSlashItems: [skill(), skill({ id: 'workflow-1', type: 'workflow', key: 'publish' })],
      skillDenyKeys: new Set(['research']),
      onToggleSkill,
      onShowInfoCard,
      onClearInfoCard,
      infoCard: {
        title: 'Research web',
        description: 'Find current sources.',
        top: 100,
        left: 200,
      },
    })

    const row = screen.getAllByText('Research web')[0]!.closest('div')!
    fireEvent.mouseEnter(row)
    expect(onShowInfoCard).toHaveBeenCalledWith(row, 'Research web', 'Find current sources.')
    fireEvent.mouseLeave(row)
    expect(onClearInfoCard).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('switch'))
    expect(onToggleSkill).toHaveBeenCalledWith('research', true)
    expect(screen.getByText('Find current sources.').closest('div')?.className).toContain(
      'max-w-spacing-72',
    )
  })

  it('renders access loading, unavailable, and policy row states', () => {
    const policy: ComposerPolicy = {
      role_defaults: [{ kind: 'action_domain', id: 'read_campaign' }],
      grants: [],
      overrides: { allow_extra: [], deny: [] },
    }
    const onToggleAccess = vi.fn()
    renderPlusMenu({ submenu: 'access', composerPolicyLoading: true })
    expect(screen.getByText('Loading access')).toBeTruthy()

    cleanup()
    renderPlusMenu({ submenu: 'access', composerPolicy: null, composerPolicyLoading: false })
    expect(screen.getByText('Access is unavailable right now.')).toBeTruthy()

    cleanup()
    renderPlusMenu({ submenu: 'access', composerPolicy: policy, onToggleAccess })
    const row = screen.getByText('Read campaign data').closest('div')!
    const accessSwitch = within(row).getByRole('switch')
    expect(accessSwitch.getAttribute('aria-checked')).toBe('true')
    expect(accessSwitch.hasAttribute('disabled')).toBe(false)
    fireEvent.click(accessSwitch)
    expect(onToggleAccess).toHaveBeenCalledWith(COMPOSER_ACCESS_ROWS[0], false)
  })

  it('renders locked system access rows as checked and disabled', () => {
    const policy: ComposerPolicy = {
      locked_defaults: [{ kind: 'action_domain', id: 'read_campaign' }],
      grants: [],
      overrides: { allow_extra: [], deny: [] },
    }
    const onToggleAccess = vi.fn()
    renderPlusMenu({ submenu: 'access', composerPolicy: policy, onToggleAccess })

    const row = screen.getByText('Read campaign data').closest('div')!
    const accessSwitch = within(row).getByRole('switch')
    expect(accessSwitch.getAttribute('aria-checked')).toBe('true')
    expect(accessSwitch.hasAttribute('disabled')).toBe(true)
    fireEvent.click(accessSwitch)
    expect(onToggleAccess).not.toHaveBeenCalled()
  })

  it('renders read-only system access rows as disabled without forcing them checked', () => {
    const policy: ComposerPolicy = {
      role_defaults: [{ kind: 'action_domain', id: 'manage_tasks_missions' }],
      locked_defaults: [{ kind: 'action_domain', id: 'manage_tasks_missions' }],
      grants: [],
      overrides: { allow_extra: [], deny: [] },
    }
    const onToggleAccess = vi.fn()
    renderPlusMenu({
      submenu: 'access',
      composerPolicy: policy,
      accessReadOnly: true,
      onToggleAccess,
    })

    const unlockedRow = screen.getByText('Generate media').closest('div')!
    const unlockedSwitch = within(unlockedRow).getByRole('switch')
    expect(unlockedSwitch.getAttribute('aria-checked')).toBe('false')
    expect(unlockedSwitch.hasAttribute('disabled')).toBe(true)

    const lockedRow = screen.getByText('Tasks and missions').closest('div')!
    const lockedSwitch = within(lockedRow).getByRole('switch')
    expect(lockedSwitch.getAttribute('aria-checked')).toBe('true')
    expect(lockedSwitch.hasAttribute('disabled')).toBe(true)

    fireEvent.click(unlockedSwitch)
    expect(onToggleAccess).not.toHaveBeenCalled()
  })
})
