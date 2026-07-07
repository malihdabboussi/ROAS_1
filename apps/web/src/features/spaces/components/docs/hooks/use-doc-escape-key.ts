'use client'

import { useEffect } from 'react'

export function useDocEscapeKey({
  inline,
  onClose,
  shareOpen,
  setShareOpen,
  pageSettingsOpen,
  setPageSettingsOpen,
  fieldsSlideOpen,
  setFieldsSlideOpen,
  requestClosePanel,
}: {
  inline: boolean
  onClose: () => void
  shareOpen: boolean
  setShareOpen: (v: boolean) => void
  pageSettingsOpen: boolean
  setPageSettingsOpen: (v: boolean) => void
  fieldsSlideOpen: boolean
  setFieldsSlideOpen: (v: boolean) => void
  requestClosePanel: () => void
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (shareOpen) {
        setShareOpen(false)
        return
      }
      if (inline && pageSettingsOpen) {
        setPageSettingsOpen(false)
        return
      }
      if (inline && fieldsSlideOpen) {
        setFieldsSlideOpen(false)
        return
      }
      if (!inline) {
        requestClosePanel()
        return
      }
      onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [
    onClose,
    inline,
    fieldsSlideOpen,
    pageSettingsOpen,
    shareOpen,
    requestClosePanel,
    setShareOpen,
    setPageSettingsOpen,
    setFieldsSlideOpen,
  ])
}
