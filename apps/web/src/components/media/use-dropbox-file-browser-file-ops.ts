'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { DropboxFileBrowserContext } from '@/components/media/dropbox-file-browser-modal.types'
import { isMediaLibrarySupportedFileName } from '@/components/media/drive-file-browser-modal.constants'
import type { useDropboxFileBrowserListing } from '@/components/media/use-dropbox-file-browser-listing'
import type { useDropboxFileBrowserSortTable } from '@/components/media/use-dropbox-file-browser-sort-table'
import { backendUpload } from '@/lib/api/backend-client'
import { MEDIA_TOAST_ERRORS, MEDIA_TOAST_SUCCESS } from '@/lib/config/media-toast-errors.config'
import { deleteDropboxFile, shareDropboxFile, type DropboxFile } from '@/lib/services/dropbox-api'

type Listing = ReturnType<typeof useDropboxFileBrowserListing>
type SortTable = ReturnType<typeof useDropboxFileBrowserSortTable>
type DropboxActionType = 'export' | 'share' | 'delete' | 'chat'

export function useDropboxFileBrowserFileOps(
  listing: Listing,
  sortTable: SortTable,
  options: {
    context: DropboxFileBrowserContext
    campaignId?: string
    onSelectFileForChat?: (file: File) => void
    onClose: () => void
    keepOpenAfterImport: boolean
  },
) {
  const { selectedFileIds, setFiles, setImportedFileIds, setSelectedFileIds } = listing
  const { sortedFiles } = sortTable
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionType, setActionType] = useState<DropboxActionType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DropboxFile | null>(null)
  const [batchImporting, setBatchImporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)

  const { context, campaignId, onSelectFileForChat, onClose, keepOpenAfterImport } = options

  const isLoadingAction = (fileId: string, type: DropboxActionType) =>
    actionLoading === fileId && actionType === type

  const handleAddToChat = useCallback(
    async (file: DropboxFile) => {
      if (!onSelectFileForChat) return
      if (context === 'media_library' && !isMediaLibrarySupportedFileName(file.name)) {
        toast.error(MEDIA_TOAST_ERRORS.FILE_TYPE_UNSUPPORTED.userMessage)
        return
      }
      setActionLoading(file.id)
      setActionType('chat')
      try {
        const { backendFetch } = await import('@/lib/api/backend-client')
        const params = new URLSearchParams({ path: file.path_lower })
        const res = await backendFetch(
          `/api/integrations/dropbox/files/download?${params.toString()}`,
        )
        if (!res.ok) throw new Error(`Download failed: ${res.status}`)
        const blob = await res.blob()
        const webFile = new File([blob], file.name, { type: blob.type })
        onSelectFileForChat(webFile)
        if (keepOpenAfterImport) {
          setImportedFileIds((prev) => new Set(prev).add(file.id))
          toast.success(`"${file.name}" queued for import`)
        } else {
          onClose()
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage,
        )
      } finally {
        setActionLoading(null)
        setActionType(null)
      }
    },
    [onSelectFileForChat, onClose, keepOpenAfterImport, context, setImportedFileIds],
  )

  const handleExportToVibey = useCallback(
    async (file: DropboxFile) => {
      setActionLoading(file.id)
      setActionType('export')
      try {
        const { backendFetch } = await import('@/lib/api/backend-client')
        const params = new URLSearchParams({ path: file.path_lower })
        const res = await backendFetch(
          `/api/integrations/dropbox/files/download?${params.toString()}`,
        )
        if (!res.ok) throw new Error(`Download failed: ${res.status}`)
        const blob = await res.blob()
        const formData = new FormData()
        formData.append('file', blob, file.name)
        formData.append('name', file.name)
        if (campaignId) formData.append('campaign_id', campaignId)
        formData.append('category', 'dropbox-import')
        await backendUpload('/api/media/upload', formData)
        toast.success(MEDIA_TOAST_SUCCESS.IMPORTED.userMessage)
      } catch {
        toast.error(MEDIA_TOAST_ERRORS.IMPORT_FAILED.userMessage)
      } finally {
        setActionLoading(null)
        setActionType(null)
      }
    },
    [campaignId],
  )

  const handleShare = useCallback(async (file: DropboxFile) => {
    setActionLoading(file.id)
    setActionType('share')
    try {
      const result = await shareDropboxFile(file.path_lower)
      await navigator.clipboard.writeText(result.url)
      toast.success(MEDIA_TOAST_SUCCESS.LINK_COPIED.userMessage)
    } catch {
      toast.error(MEDIA_TOAST_ERRORS.CREATE_LINK_FAILED.userMessage)
    } finally {
      setActionLoading(null)
      setActionType(null)
    }
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const file = deleteTarget
    setDeleteTarget(null)
    setActionLoading(file.id)
    setActionType('delete')
    try {
      await deleteDropboxFile(file.path_lower)
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
      toast.success(MEDIA_TOAST_SUCCESS.DELETED.userMessage)
    } catch {
      toast.error(MEDIA_TOAST_ERRORS.DELETE_FAILED.userMessage)
    } finally {
      setActionLoading(null)
      setActionType(null)
    }
  }, [deleteTarget, setFiles])

  const handleBatchImport = useCallback(async () => {
    if (!onSelectFileForChat || selectedFileIds.size === 0) return
    setBatchImporting(true)
    setBatchProgress(0)
    const selected = sortedFiles.filter((f) => selectedFileIds.has(f.id) && f['.tag'] !== 'folder')
    let completed = 0
    for (const file of selected) {
      try {
        const { backendFetch } = await import('@/lib/api/backend-client')
        const params = new URLSearchParams({ path: file.path_lower })
        const res = await backendFetch(
          `/api/integrations/dropbox/files/download?${params.toString()}`,
        )
        if (!res.ok) throw new Error(`Download failed: ${res.status}`)
        const blob = await res.blob()
        const webFile = new File([blob], file.name, { type: blob.type })
        onSelectFileForChat(webFile)
      } catch {
        toast.error(`Failed to import "${file.name}"`)
      }
      completed++
      setBatchProgress(completed)
    }
    toast.success(`${completed} file(s) queued for import`)
    setBatchImporting(false)
    if (keepOpenAfterImport) {
      setImportedFileIds((prev) => {
        const next = new Set(prev)
        for (const id of selectedFileIds) next.add(id)
        return next
      })
      setSelectedFileIds(new Set())
    } else {
      setSelectedFileIds(new Set())
      onClose()
    }
  }, [
    onSelectFileForChat,
    selectedFileIds,
    sortedFiles,
    onClose,
    keepOpenAfterImport,
    setImportedFileIds,
    setSelectedFileIds,
  ])

  return {
    actionLoading,
    actionType,
    setActionType,
    isLoadingAction,
    deleteTarget,
    setDeleteTarget,
    batchImporting,
    batchProgress,
    handleAddToChat,
    handleExportToVibey,
    handleShare,
    confirmDelete,
    handleBatchImport,
  }
}
