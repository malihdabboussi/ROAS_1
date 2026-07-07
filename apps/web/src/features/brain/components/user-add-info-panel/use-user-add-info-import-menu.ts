import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { getFathomStatus, getFirefliesStatus } from '../../services/user-brain-import.service'

export function useUserAddInfoImportMenu() {
  const importBtnRef = useRef<HTMLButtonElement>(null)
  const [importDropdownOpen, setImportDropdownOpen] = useState(false)
  const [importDropdownPos, setImportDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const [fathomConnected, setFathomConnected] = useState(false)
  const [firefliesConnected, setFirefliesConnected] = useState(false)

  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  } = useCloudAttach({
    behavior: 'connect_if_disconnected',
    onBeforeOpen: () => setImportDropdownOpen(false),
    onDriveStatusErrorToast: MEDIA_TOAST_ERRORS.DRIVE_STATUS_CHECK_FAILED.userMessage,
    onDropboxStatusErrorToast: MEDIA_TOAST_ERRORS.DROPBOX_STATUS_CHECK_FAILED.userMessage,
  })

  useLayoutEffect(() => {
    if (!importDropdownOpen || !importBtnRef.current) return
    const rect = importBtnRef.current.getBoundingClientRect()
    setImportDropdownPos({ top: rect.bottom + 4, left: rect.right - 260, width: 260 })
  }, [importDropdownOpen])

  useEffect(() => {
    if (!importDropdownOpen) return
    void Promise.all([getFathomStatus(), getFirefliesStatus()])
      .then(([f, ff]) => {
        setFathomConnected(f.connected)
        setFirefliesConnected(ff.connected)
      })
      .catch(() => {})
  }, [importDropdownOpen])

  useEffect(() => {
    if (!importDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        importBtnRef.current &&
        !importBtnRef.current.contains(target) &&
        !(e.target as HTMLElement).closest('[data-import-dropdown]')
      ) {
        setImportDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [importDropdownOpen])

  return {
    importBtnRef,
    importDropdownOpen,
    setImportDropdownOpen,
    importDropdownPos,
    fathomConnected,
    firefliesConnected,
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  }
}
