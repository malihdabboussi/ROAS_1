'use client'

import { useCallback, type RefObject } from 'react'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'

interface UseChatInputCloudAttachOptions {
  fileInputRef: RefObject<HTMLInputElement | null>
  closePlusMenu: () => void
  handleFileSelect: (files: File[] | FileList) => void | Promise<void>
}

export function useChatInputCloudAttach({
  fileInputRef,
  closePlusMenu,
  handleFileSelect,
}: UseChatInputCloudAttachOptions) {
  const cloudAttach = useCloudAttach({
    behavior: 'toast_if_disconnected',
    onBeforeOpen: closePlusMenu,
    onDriveDisconnectedToast: CHAT_TOAST_ERRORS.CLOUD_DRIVE_DISCONNECTED.userMessage,
    onDropboxDisconnectedToast: CHAT_TOAST_ERRORS.CLOUD_DROPBOX_DISCONNECTED.userMessage,
    onDriveStatusErrorToast: CHAT_TOAST_ERRORS.CLOUD_DRIVE_DISCONNECTED.userMessage,
    onDropboxStatusErrorToast: CHAT_TOAST_ERRORS.CLOUD_DROPBOX_DISCONNECTED.userMessage,
  })

  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [fileInputRef])

  const handleFileFromCloud = useCallback(
    (file: File) => {
      void handleFileSelect([file])
    },
    [handleFileSelect],
  )

  return {
    ...cloudAttach,
    handleFileButtonClick,
    handleFileFromCloud,
  }
}
