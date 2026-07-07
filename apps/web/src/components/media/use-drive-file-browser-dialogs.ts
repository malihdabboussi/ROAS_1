'use client'

import { useEffect, useRef, useState } from 'react'

export function useDriveFileBrowserDialogs() {
  const [renameFileId, setRenameFileId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [shareFileId, setShareFileId] = useState<string | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState<'reader' | 'writer' | 'commenter'>('reader')
  const [moreMenuFileId, setMoreMenuFileId] = useState<string | null>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreMenuFileId) return
    const handle = (e: MouseEvent) => {
      if (!moreMenuRef.current?.contains(e.target as HTMLElement)) setMoreMenuFileId(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [moreMenuFileId])

  return {
    renameFileId,
    setRenameFileId,
    renameValue,
    setRenameValue,
    shareFileId,
    setShareFileId,
    shareEmail,
    setShareEmail,
    shareRole,
    setShareRole,
    moreMenuFileId,
    setMoreMenuFileId,
    moreMenuRef,
  }
}
