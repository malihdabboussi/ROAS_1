import { createRef } from 'react'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComposerPlusSubmenu } from './chat-input-policy'
import { useChatInputCloudAttach } from './use-chat-input-cloud-attach'
import { useChatInputComposerAccess } from './use-chat-input-composer-access'
import { useChatInputPlusController } from './use-chat-input-plus-controller'
import { useChatInputPlusMenu } from './use-chat-input-plus-menu'
import { useChatInputPlusMenuProps } from './use-chat-input-plus-menu-props'

vi.mock('./use-chat-input-plus-menu', () => ({
  useChatInputPlusMenu: vi.fn(),
}))

vi.mock('./use-chat-input-composer-access', () => ({
  useChatInputComposerAccess: vi.fn(),
}))

vi.mock('./use-chat-input-cloud-attach', () => ({
  useChatInputCloudAttach: vi.fn(),
}))

vi.mock('./use-chat-input-plus-menu-props', () => ({
  useChatInputPlusMenuProps: vi.fn(),
}))

const mockUseChatInputPlusMenu = vi.mocked(useChatInputPlusMenu)
const mockUseChatInputComposerAccess = vi.mocked(useChatInputComposerAccess)
const mockUseChatInputCloudAttach = vi.mocked(useChatInputCloudAttach)
const mockUseChatInputPlusMenuProps = vi.mocked(useChatInputPlusMenuProps)

describe('useChatInputPlusController', () => {
  let plusButtonRef: ReturnType<typeof createRef<HTMLButtonElement>>
  let plusMenuRef: ReturnType<typeof createRef<HTMLDivElement>>
  let plusSubmenuRef: ReturnType<typeof createRef<HTMLDivElement>>
  let plusSubmenuAnchorRefs: {
    current: Record<Exclude<ComposerPlusSubmenu, null>, HTMLButtonElement | null>
  }
  let openPlusSubmenuPosition: ReturnType<typeof vi.fn>
  let closePlusMenu: ReturnType<typeof vi.fn>
  let handleFileSelect: ReturnType<typeof vi.fn>
  let handleComposerOpenAtMenu: ReturnType<typeof vi.fn>

  beforeEach(() => {
    plusButtonRef = createRef<HTMLButtonElement>()
    plusMenuRef = createRef<HTMLDivElement>()
    plusSubmenuRef = createRef<HTMLDivElement>()
    plusSubmenuAnchorRefs = {
      current: {
        create: null,
        files: null,
        attach: null,
        integrations: null,
        skills: null,
        access: null,
        space: null,
      },
    }
    openPlusSubmenuPosition = vi.fn()
    closePlusMenu = vi.fn()
    handleFileSelect = vi.fn()
    handleComposerOpenAtMenu = vi.fn()

    mockUseChatInputPlusMenu.mockReturnValue({
      plusMenuOpen: true,
      setPlusMenuOpen: vi.fn(),
      plusMenuPos: { top: 10, left: 20 },
      plusSubmenu: 'skills',
      setPlusSubmenu: vi.fn(),
      plusSubmenuPos: { top: 30, left: 40 },
      plusInfoCard: null,
      plusButtonRef,
      plusMenuRef,
      plusSubmenuRef,
      plusSubmenuAnchorRefs,
      updatePlusSubmenuPosition: vi.fn(),
      closePlusMenu,
      togglePlusMenu: vi.fn(),
      cancelPlusSubmenuClose: vi.fn(),
      schedulePlusSubmenuClose: vi.fn(),
      openPlusSubmenu: openPlusSubmenuPosition,
      showPlusInfoCard: vi.fn(),
      clearPlusInfoCard: vi.fn(),
    })

    mockUseChatInputComposerAccess.mockReturnValue({
      connectedProviders: ['google-drive'],
      agentToggles: [],
      skillDenyKeys: new Set(['skill-1']),
      skillTogglePending: null,
      composerPolicy: null,
      composerPolicyLoading: false,
      composerPolicyPending: null,
      composerAccessReadOnly: true,
      suggestedUnconnected: ['dropbox'],
      openPlusSubmenu: vi.fn(),
      handleToggleAgent: vi.fn(),
      handleSkillToggle: vi.fn(),
      handleAccessToggle: vi.fn(),
      handleConnectIntegration: vi.fn(),
    })

    mockUseChatInputCloudAttach.mockReturnValue({
      driveConnected: false,
      dropboxConnected: false,
      refreshConnectionStatus: vi.fn(),
      showDrivePicker: true,
      setShowDrivePicker: vi.fn(),
      showDropboxPicker: false,
      setShowDropboxPicker: vi.fn(),
      openDrive: vi.fn(),
      openDropbox: vi.fn(),
      handleFileButtonClick: vi.fn(),
      handleFileFromCloud: vi.fn(),
    })

    mockUseChatInputPlusMenuProps.mockReturnValue({
      plusMenuProps: {
        open: true,
      } as never,
    })
  })

  it('wires plus menu state, composer access, cloud attach, and portal props together', () => {
    const fileInputRef = createRef<HTMLInputElement>()
    const portalTargetRef = createRef<HTMLElement>()
    const allSlashItems = [{ id: 'skill-1', label: 'Skill', type: 'skill' }] as never

    const { result } = renderHook(() =>
      useChatInputPlusController({
        agentKey: 'vibey',
        portalTargetRef,
        fileInputRef,
        handleFileSelect,
        allSlashItems,
        onOpenAtMenu: handleComposerOpenAtMenu,
        onSelectCreateItem: vi.fn(),
      }),
    )

    expect(mockUseChatInputComposerAccess).toHaveBeenCalledWith({
      agentKey: 'vibey',
      openPlusSubmenuPosition,
    })
    expect(mockUseChatInputCloudAttach).toHaveBeenCalledWith({
      fileInputRef,
      closePlusMenu,
      handleFileSelect,
    })
    expect(mockUseChatInputPlusMenuProps).toHaveBeenCalledWith(
      expect.objectContaining({
        portalTargetRef,
        menuRef: plusMenuRef,
        submenuRef: plusSubmenuRef,
        menuPosition: { top: 10, left: 20 },
        submenu: 'skills',
        submenuPosition: { top: 30, left: 40 },
        accessReadOnly: true,
        connectedProviders: ['google-drive'],
        suggestedUnconnected: ['dropbox'],
        skillDenyKeys: new Set(['skill-1']),
        allSlashItems,
        plusSubmenuAnchorRefs,
        onCloseMenu: closePlusMenu,
        onOpenAtMenu: handleComposerOpenAtMenu,
      }),
    )
    expect(result.current.plusButtonRef).toBe(plusButtonRef)
    expect(result.current.plusMenuRef).toBe(plusMenuRef)
    expect(result.current.plusSubmenuRef).toBe(plusSubmenuRef)
    expect(result.current.plusMenuOpen).toBe(true)
    expect(result.current.showDrivePicker).toBe(true)
    expect(result.current.showDropboxPicker).toBe(false)
    expect(result.current.plusMenuProps).toEqual({ open: true })
  })
})
