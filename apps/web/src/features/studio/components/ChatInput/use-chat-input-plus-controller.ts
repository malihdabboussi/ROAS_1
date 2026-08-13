import { useCallback, type RefObject } from 'react'
import type { ChatInputPlusMenuAgentPickerConfig } from './chat-input-plus-menu-agent.types'
import type { ChatInputPlusMenuSpacePickerConfig } from './chat-input-plus-menu-space.types'
import type { SlashItem } from './chat-input-slash-menu'
import { useChatInputCloudAttach } from './use-chat-input-cloud-attach'
import { useChatInputComposerAccess } from './use-chat-input-composer-access'
import { useChatInputPlusMenu } from './use-chat-input-plus-menu'
import { useChatInputPlusMenuProps } from './use-chat-input-plus-menu-props'

interface UseChatInputPlusControllerOptions {
  agentKey: string
  portalTargetRef?: RefObject<HTMLElement | null>
  fileInputRef: RefObject<HTMLInputElement | null>
  handleFileSelect: (files: File[] | FileList) => void | Promise<void>
  allSlashItems: SlashItem[]
  onOpenAtMenu: () => void
  onGenerateImage: () => void
  plusMenuSpacePicker?: ChatInputPlusMenuSpacePickerConfig
  plusMenuAgentPicker?: ChatInputPlusMenuAgentPickerConfig
}

export function useChatInputPlusController({
  agentKey,
  portalTargetRef,
  fileInputRef,
  handleFileSelect,
  allSlashItems,
  onOpenAtMenu,
  onGenerateImage,
  plusMenuSpacePicker,
  plusMenuAgentPicker,
}: UseChatInputPlusControllerOptions) {
  const {
    plusMenuOpen,
    plusMenuRootVisible,
    setPlusMenuOpen,
    plusMenuPos,
    plusSubmenu,
    setPlusSubmenu,
    plusSubmenuPos,
    plusInfoCard,
    plusButtonRef,
    plusMenuRef,
    plusSubmenuRef,
    plusSubmenuAnchorRefs,
    closePlusMenu,
    togglePlusMenu,
    openPlusMenu: openPlusMenuPosition,
    cancelPlusSubmenuClose,
    schedulePlusSubmenuClose,
    openPlusSubmenu: openPlusSubmenuPosition,
    showPlusInfoCard,
    clearPlusInfoCard,
  } = useChatInputPlusMenu()

  const {
    connectedProviders,
    agentToggles,
    skillDenyKeys,
    skillTogglePending,
    composerPolicy,
    composerPolicyLoading,
    composerPolicyPending,
    composerAccessReadOnly,
    suggestedUnconnected,
    loadIntegrationOverview,
    openPlusSubmenu,
    handleToggleAgent,
    handleSkillToggle,
    handleAccessToggle,
    handleConnectIntegration,
  } = useChatInputComposerAccess({
    agentKey,
    openPlusSubmenuPosition,
  })

  const openPlusMenu = useCallback(
    (submenu?: Parameters<typeof openPlusMenuPosition>[0]) => {
      openPlusMenuPosition(submenu)
      if (submenu === 'integrations') loadIntegrationOverview()
    },
    [loadIntegrationOverview, openPlusMenuPosition],
  )

  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
    handleFileButtonClick,
    handleFileFromCloud,
  } = useChatInputCloudAttach({
    fileInputRef,
    closePlusMenu,
    handleFileSelect,
  })

  const { plusMenuProps } = useChatInputPlusMenuProps({
    open: plusMenuOpen,
    rootMenuVisible: plusMenuRootVisible,
    portalTargetRef,
    menuRef: plusMenuRef,
    submenuRef: plusSubmenuRef,
    menuPosition: plusMenuPos,
    submenu: plusSubmenu,
    submenuPosition: plusSubmenuPos,
    infoCard: plusInfoCard,
    connectedProviders,
    suggestedUnconnected,
    agentToggles,
    allSlashItems,
    skillDenyKeys,
    skillTogglePending,
    composerPolicy,
    composerPolicyLoading,
    composerPolicyPending,
    accessReadOnly: composerAccessReadOnly,
    plusSubmenuAnchorRefs,
    onOpenSubmenu: openPlusSubmenu,
    onCancelSubmenuClose: cancelPlusSubmenuClose,
    onScheduleSubmenuClose: schedulePlusSubmenuClose,
    onLocalUpload: handleFileButtonClick,
    onDrive: openDrive,
    onDropbox: openDropbox,
    onGenerateImage,
    onCloseMenu: closePlusMenu,
    onOpenAtMenu,
    handleToggleAgent,
    handleConnectIntegration,
    handleSkillToggle,
    handleAccessToggle,
    onShowInfoCard: showPlusInfoCard,
    onClearInfoCard: clearPlusInfoCard,
    spacePicker: plusMenuSpacePicker ?? null,
    agentPicker: plusMenuAgentPicker ?? null,
  })

  return {
    plusMenuOpen,
    setPlusMenuOpen,
    setPlusSubmenu,
    plusButtonRef,
    plusMenuRef,
    plusSubmenuRef,
    togglePlusMenu,
    openPlusMenu,
    connectedProviders,
    loadIntegrationOverview,
    plusMenuProps,
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    handleFileFromCloud,
  }
}
