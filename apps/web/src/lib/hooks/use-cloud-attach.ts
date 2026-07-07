'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { connectDropbox, getDropboxStatus } from '@/lib/services/dropbox-api'
import { connectGoogleDrive, getGoogleDriveStatus } from '@/lib/services/google-drive-api'

export type CloudAttachBehavior = 'toast_if_disconnected' | 'connect_if_disconnected'

interface DisconnectedToastAction {
  label: string
  onClick: () => void
}

interface UseCloudAttachOptions {
  behavior: CloudAttachBehavior
  onBeforeOpen?: () => void
  loadConnectionStatus?: boolean
  onDriveDisconnectedToast?: string
  onDropboxDisconnectedToast?: string
  onDriveStatusErrorToast?: string
  onDropboxStatusErrorToast?: string
  onDriveDisconnectedAction?: DisconnectedToastAction
  onDropboxDisconnectedAction?: DisconnectedToastAction
}

export function useCloudAttach({
  behavior,
  onBeforeOpen,
  loadConnectionStatus = false,
  onDriveDisconnectedToast = 'Connect Google Drive to attach files',
  onDropboxDisconnectedToast = 'Connect Dropbox to attach files',
  onDriveStatusErrorToast = 'Connect Google Drive to attach files',
  onDropboxStatusErrorToast = 'Connect Dropbox to attach files',
  onDriveDisconnectedAction,
  onDropboxDisconnectedAction,
}: UseCloudAttachOptions) {
  const [driveConnected, setDriveConnected] = useState(false)
  const [dropboxConnected, setDropboxConnected] = useState(false)
  const [showDrivePicker, setShowDrivePicker] = useState(false)
  const [showDropboxPicker, setShowDropboxPicker] = useState(false)

  const refreshConnectionStatus = useCallback(async () => {
    const [driveStatus, dropboxStatus] = await Promise.all([
      getGoogleDriveStatus().catch(() => null),
      getDropboxStatus().catch(() => null),
    ])
    setDriveConnected(Boolean(driveStatus?.connected))
    setDropboxConnected(Boolean(dropboxStatus?.connected))
  }, [])

  useEffect(() => {
    if (!loadConnectionStatus) return
    void refreshConnectionStatus()
  }, [loadConnectionStatus, refreshConnectionStatus])

  const openDrive = useCallback(async () => {
    onBeforeOpen?.()
    try {
      const status = await getGoogleDriveStatus()
      if (status.connected) {
        setDriveConnected(true)
        setShowDrivePicker(true)
        return
      }
      if (behavior === 'connect_if_disconnected') {
        setDriveConnected(false)
        const redirectTo = typeof window !== 'undefined' ? window.location.href : ''
        const res = await connectGoogleDrive(redirectTo)
        if (res.authorizeUrl) window.location.href = res.authorizeUrl
        return
      }
      toast.error(
        onDriveDisconnectedToast,
        onDriveDisconnectedAction ? { action: onDriveDisconnectedAction } : undefined,
      )
    } catch {
      toast.error(onDriveStatusErrorToast)
    }
  }, [
    behavior,
    onBeforeOpen,
    onDriveDisconnectedToast,
    onDriveStatusErrorToast,
    onDriveDisconnectedAction,
  ])

  const openDropbox = useCallback(async () => {
    onBeforeOpen?.()
    try {
      const status = await getDropboxStatus()
      if (status.connected) {
        setDropboxConnected(true)
        setShowDropboxPicker(true)
        return
      }
      if (behavior === 'connect_if_disconnected') {
        setDropboxConnected(false)
        const redirectTo = typeof window !== 'undefined' ? window.location.href : ''
        const res = await connectDropbox(redirectTo)
        if (res.authorizeUrl) window.location.href = res.authorizeUrl
        return
      }
      toast.error(
        onDropboxDisconnectedToast,
        onDropboxDisconnectedAction ? { action: onDropboxDisconnectedAction } : undefined,
      )
    } catch {
      toast.error(onDropboxStatusErrorToast)
    }
  }, [
    behavior,
    onBeforeOpen,
    onDropboxDisconnectedToast,
    onDropboxStatusErrorToast,
    onDropboxDisconnectedAction,
  ])

  return {
    driveConnected,
    dropboxConnected,
    refreshConnectionStatus,
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  }
}
