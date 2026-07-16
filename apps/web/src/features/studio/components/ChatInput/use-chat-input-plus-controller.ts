import type { RefObject } from 'react'
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
}: UseChatInputPlusControllerOptions) {
  const {
    plusMenuOpen,
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
    openPlusSubmenu,
    handleToggleAgent,
    handleSkillToggle,
    handleAccessToggle,
    handleConnectIntegration,
  } = useChatInputComposerAccess({
    agentKey,
    openPlusSubmenuPosition,
  })

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
  })

  return {
    plusMenuOpen,
    setPlusMenuOpen,
    setPlusSubmenu,
    plusButtonRef,
    plusMenuRef,
    plusSubmenuRef,
    togglePlusMenu,
    plusMenuProps,
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    handleFileFromCloud,
  }
}
