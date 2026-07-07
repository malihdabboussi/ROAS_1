'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { FOLDER_MIME } from '@/components/media/drive-file-browser-modal.constants'
import type { DriveFileBrowserContext } from '@/components/media/drive-file-browser-modal.types'
import { isMediaLibrarySupportedMime } from '@/components/media/drive-file-browser-modal.utils'
import type { useDriveFileBrowserDialogs } from '@/components/media/use-drive-file-browser-dialogs'
import type { useDriveFileBrowserListing } from '@/components/media/use-drive-file-browser-listing'
import type { useDriveFileBrowserSortTable } from '@/components/media/use-drive-file-browser-sort-table'
import { backendUpload } from '@/lib/api/backend-client'
import { MEDIA_TOAST_ERRORS, MEDIA_TOAST_SUCCESS } from '@/lib/config/media-toast-errors.config'
import { reportClientError } from '@/lib/log-client-error'
import {
  deleteDriveFile,
  renameDriveFile,
  shareDriveFile,
  type GoogleDriveFile,
} from '@/lib/services/google-drive-api'

type Listing = ReturnType<typeof useDriveFileBrowserListing>
type SortTable = ReturnType<typeof useDriveFileBrowserSortTable>
type Dialogs = ReturnType<typeof useDriveFileBrowserDialogs>

export function useDriveFileBrowserFileOps(
  listing: Listing,
  sortTable: SortTable,
  dialogs: Dialogs,
  options: {
    context: DriveFileBrowserContext
    campaignId?: string
    onSelectFileForChat?: (file: File) => void
    onClose: () => void
    keepOpenAfterImport: boolean
  },
) {
  const { setFiles, setImportedFileIds, setSelectedFileIds, selectedFileIds } = listing
  const { sortedFiles } = sortTable
  const {
    renameFileId,
    renameValue,
    setRenameFileId,
    shareFileId,
    shareEmail,
    shareRole,
    setShareFileId,
    setShareEmail,
    setShareRole,
  } = dialogs

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'chat' | 'export' | null>(null)
  const [batchImporting, setBatchImporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)

  const { context, campaignId, onSelectFileForChat, onClose, keepOpenAfterImport } = options

  const isLoadingAction = (fileId: string, type: 'chat' | 'export') =>
    actionLoading === fileId && actionType === type

  const handleAddToChat = useCallback(
    async (file: GoogleDriveFile) => {
      if (!onSelectFileForChat) return
      if (context === 'media_library' && !isMediaLibrarySupportedMime(file.mimeType)) {
        toast.error(MEDIA_TOAST_ERRORS.FILE_TYPE_UNSUPPORTED.userMessage)
        return
      }
      setActionLoading(file.id)
      try {
        const { backendFetch } = await import('@/lib/api/backend-client')
        const res = await backendFetch(`/api/integrations/google-drive/files/${file.id}/download`)
        if (!res.ok) throw new Error('Download failed')
        const blob = await res.blob()
        const contentDisp = res.headers.get('content-disposition')
        let exportName = file.name
        const cdMatch = contentDisp?.match(/filename="([^"]+)"/)
        if (cdMatch?.[1]) exportName = cdMatch[1]
        else if (blob.type === 'application/pdf' && !exportName.endsWith('.pdf'))
          exportName += '.pdf'
        else if (blob.type === 'text/csv' && !exportName.endsWith('.csv')) exportName += '.csv'
        else if (blob.type === 'image/png' && !exportName.endsWith('.png')) exportName += '.png'
        exportName = exportName.replace(/[/:*?"<>|]/g, '_')
        const webFile = new File([blob], exportName, { type: blob.type })
        onSelectFileForChat(webFile)
        if (keepOpenAfterImport) {
          setImportedFileIds((prev) => new Set(prev).add(file.id))
          toast.success(`"${file.name}" queued for import`)
        } else {
          onClose()
        }
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage
        void reportClientError({
          feature: 'ui/google_drive_browser',
          error_code: 'drive_add_to_chat_failed',
          message: msg,
        })
        toast.error(msg)
      } finally {
        setActionLoading(null)
      }
    },
    [onSelectFileForChat, onClose, keepOpenAfterImport, context, setImportedFileIds],
  )

  const handleExportToVibey = useCallback(
    async (file: GoogleDriveFile) => {
      setActionLoading(file.id)
      try {
        const { backendFetch } = await import('@/lib/api/backend-client')
        const res = await backendFetch(`/api/integrations/google-drive/files/${file.id}/download`)
        if (!res.ok) throw new Error('Download failed')
        const blob = await res.blob()
        const contentDisp = res.headers.get('content-disposition')
        let exportName = file.name
        const cdMatch = contentDisp?.match(/filename="([^"]+)"/)
        if (cdMatch?.[1]) exportName = cdMatch[1]
        else if (blob.type === 'application/pdf' && !exportName.endsWith('.pdf'))
          exportName += '.pdf'
        else if (blob.type === 'text/csv' && !exportName.endsWith('.csv')) exportName += '.csv'
        else if (blob.type === 'image/png' && !exportName.endsWith('.png')) exportName += '.png'
        exportName = exportName.replace(/[/:*?"<>|]/g, '_')
        const formData = new FormData()
        formData.append('file', new File([blob], exportName, { type: blob.type }), exportName)
        formData.append('name', exportName)
        if (campaignId) formData.append('campaign_id', campaignId)
        formData.append('category', 'drive-import')
        await backendUpload('/api/media/upload', formData)
        toast.success(MEDIA_TOAST_SUCCESS.IMPORTED.userMessage)
      } catch {
        void reportClientError({
          feature: 'ui/google_drive_browser',
          error_code: 'drive_export_vibey_failed',
          message: 'handleExportToVibey failed',
        })
        toast.error(MEDIA_TOAST_ERRORS.IMPORT_FAILED.userMessage)
      } finally {
        setActionLoading(null)
      }
    },
    [campaignId],
  )

  const handleDownload = useCallback(async (file: GoogleDriveFile) => {
    setActionLoading(file.id)
    try {
      const { backendFetch } = await import('@/lib/api/backend-client')
      const res = await backendFetch(`/api/integrations/google-drive/files/${file.id}/download`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      void reportClientError({
        feature: 'ui/google_drive_browser',
        error_code: 'drive_download_failed',
        message: 'handleDownload failed',
      })
      toast.error(MEDIA_TOAST_ERRORS.DOWNLOAD_FAILED.userMessage)
    } finally {
      setActionLoading(null)
    }
  }, [])

  const handleRename = useCallback(async () => {
    if (!renameFileId || !renameValue.trim()) {
      setRenameFileId(null)
      return
    }
    setActionLoading(renameFileId)
    try {
      await renameDriveFile(renameFileId, renameValue.trim())
      setFiles((prev) =>
        prev.map((f) => (f.id === renameFileId ? { ...f, name: renameValue.trim() } : f)),
      )
      toast.success(MEDIA_TOAST_SUCCESS.RENAMED.userMessage)
    } catch {
      void reportClientError({
        feature: 'ui/google_drive_browser',
        error_code: 'drive_rename_failed',
        message: 'handleRename failed',
      })
      toast.error(MEDIA_TOAST_ERRORS.RENAME_FAILED.userMessage)
    } finally {
      setActionLoading(null)
      setRenameFileId(null)
    }
  }, [renameFileId, renameValue, setFiles, setRenameFileId])

  const handleShare = useCallback(async () => {
    if (!shareFileId || !shareEmail.trim()) {
      setShareFileId(null)
      return
    }
    setActionLoading(shareFileId)
    try {
      await shareDriveFile(shareFileId, shareEmail.trim(), shareRole)
      toast.success(MEDIA_TOAST_SUCCESS.SHARED.userMessage)
    } catch {
      void reportClientError({
        feature: 'ui/google_drive_browser',
        error_code: 'drive_share_failed',
        message: 'handleShare failed',
      })
      toast.error(MEDIA_TOAST_ERRORS.SHARE_FAILED.userMessage)
    } finally {
      setActionLoading(null)
      setShareFileId(null)
      setShareEmail('')
      setShareRole('reader')
    }
  }, [shareFileId, shareEmail, shareRole, setShareFileId, setShareEmail, setShareRole])

  const handleDelete = useCallback(
    async (file: GoogleDriveFile) => {
      setActionLoading(file.id)
      try {
        await deleteDriveFile(file.id)
        setFiles((prev) => prev.filter((f) => f.id !== file.id))
        toast.success(MEDIA_TOAST_SUCCESS.DELETED.userMessage)
      } catch {
        void reportClientError({
          feature: 'ui/google_drive_browser',
          error_code: 'drive_delete_failed',
          message: 'handleDelete failed',
        })
        toast.error(MEDIA_TOAST_ERRORS.DELETE_FAILED.userMessage)
      } finally {
        setActionLoading(null)
      }
    },
    [setFiles],
  )

  const handleBatchImport = useCallback(async () => {
    if (!onSelectFileForChat || selectedFileIds.size === 0) return
    setBatchImporting(true)
    setBatchProgress(0)
    const selected = sortedFiles.filter(
      (f) => selectedFileIds.has(f.id) && f.mimeType !== FOLDER_MIME,
    )
    let completed = 0
    for (const file of selected) {
      try {
        const { backendFetch } = await import('@/lib/api/backend-client')
        const res = await backendFetch(`/api/integrations/google-drive/files/${file.id}/download`)
        if (!res.ok) throw new Error('Download failed')
        const blob = await res.blob()
        const contentDisp = res.headers.get('content-disposition')
        let exportName = file.name
        const cdMatch = contentDisp?.match(/filename="([^"]+)"/)
        if (cdMatch?.[1]) exportName = cdMatch[1]
        else if (blob.type === 'application/pdf' && !exportName.endsWith('.pdf'))
          exportName += '.pdf'
        else if (blob.type === 'text/csv' && !exportName.endsWith('.csv')) exportName += '.csv'
        else if (blob.type === 'image/png' && !exportName.endsWith('.png')) exportName += '.png'
        exportName = exportName.replace(/[/:*?"<>|]/g, '_')
        const webFile = new File([blob], exportName, { type: blob.type })
        onSelectFileForChat(webFile)
      } catch {
        void reportClientError({
          feature: 'ui/google_drive_browser',
          error_code: 'drive_batch_import_failed',
          message: `Failed to import "${file.name}"`,
          context: { fileId: file.id },
        })
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
    batchImporting,
    batchProgress,
    handleAddToChat,
    handleExportToVibey,
    handleDownload,
    handleRename,
    handleShare,
    handleDelete,
    handleBatchImport,
  }
}
