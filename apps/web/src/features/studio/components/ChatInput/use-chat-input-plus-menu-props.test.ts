import { createRef } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComposerPlusSubmenu } from './chat-input-policy'
import { useChatInputPlusMenuProps } from './use-chat-input-plus-menu-props'

type PlusSubmenuId = Exclude<ComposerPlusSubmenu, null>

function createOptions() {
  const plusSubmenuAnchorRefs = {
    current: {
      agent: null,
      files: null,
      attach: null,
      integrations: null,
      skills: null,
      access: null,
      space: null,
    } satisfies Record<PlusSubmenuId, HTMLButtonElement | null>,
  }
  const portalTarget = document.createElement('div')
  const portalTargetRef = createRef<HTMLElement>()
  portalTargetRef.current = portalTarget

  return {
    open: true,
    portalTargetRef,
    menuRef: createRef<HTMLDivElement>(),
    submenuRef: createRef<HTMLDivElement>(),
    menuPosition: { top: 10, left: 20 },
    submenu: 'skills' as ComposerPlusSubmenu,
    submenuPosition: { top: 30, left: 40 },
    infoCard: null,
    connectedProviders: ['google-drive'],
    suggestedUnconnected: ['dropbox'],
    agentToggles: [],
    allSlashItems: [],
    skillDenyKeys: new Set<string>(),
    skillTogglePending: null,
    composerPolicy: null,
    composerPolicyLoading: false,
    composerPolicyPending: null,
    accessReadOnly: false,
    plusSubmenuAnchorRefs,
    onOpenSubmenu: vi.fn(),
    onCancelSubmenuClose: vi.fn(),
    onScheduleSubmenuClose: vi.fn(),
    onLocalUpload: vi.fn(),
    onDrive: vi.fn(),
    onDropbox: vi.fn(),
    onGenerateImage: vi.fn(),
    onCloseMenu: vi.fn(),
    onOpenAtMenu: vi.fn(),
    handleToggleAgent: vi.fn(),
    handleConnectIntegration: vi.fn(),
    handleSkillToggle: vi.fn(),
    handleAccessToggle: vi.fn(),
    onShowInfoCard: vi.fn(),
    onClearInfoCard: vi.fn(),
    portalTarget,
  }
}

describe('useChatInputPlusMenuProps', () => {
  it('derives the portal target and stores submenu anchor nodes', () => {
    const options = createOptions()
    const { result } = renderHook(() => useChatInputPlusMenuProps(options))
    const anchor = document.createElement('button')

    act(() => result.current.plusMenuProps.onSubmenuAnchorNode('skills', anchor))

    expect(result.current.plusMenuProps.portalTarget).toBe(options.portalTarget)
    expect(options.plusSubmenuAnchorRefs.current.skills).toBe(anchor)
  })

  it('wraps async integration, skill, agent, and access handlers as fire-and-forget callbacks', () => {
    const options = createOptions()
    const { result } = renderHook(() => useChatInputPlusMenuProps(options))
    const accessRow = { key: 'contacts', label: 'Contacts', description: 'Use contacts' } as never

    act(() => {
      result.current.plusMenuProps.onToggleAgent('google-drive', true)
      result.current.plusMenuProps.onConnectIntegration('dropbox')
      result.current.plusMenuProps.onToggleSkill('skill-1', false)
      result.current.plusMenuProps.onToggleAccess(accessRow, true)
    })

    expect(options.handleToggleAgent).toHaveBeenCalledWith('google-drive', true)
    expect(options.handleConnectIntegration).toHaveBeenCalledWith('dropbox')
    expect(options.handleSkillToggle).toHaveBeenCalledWith('skill-1', false)
    expect(options.handleAccessToggle).toHaveBeenCalledWith(accessRow, true)
  })
})
