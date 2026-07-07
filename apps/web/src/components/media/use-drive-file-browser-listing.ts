'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { toast } from 'sonner'
import { FOLDER_MIME } from '@/components/media/drive-file-browser-modal.constants'
import type {
  DocsDriveBrowseSeed,
  DriveSource,
} from '@/components/media/drive-file-browser-modal.types'
import { MEDIA_TOAST_ERRORS, MEDIA_TOAST_SUCCESS } from '@/lib/config/media-toast-errors.config'
import { reportClientError } from '@/lib/log-client-error'
import {
  listDriveFiles,
  listSharedDrives,
  type GoogleDriveFile,
} from '@/lib/services/google-drive-api'

export function useDriveFileBrowserListing(
  open: boolean,
  pickFoldersOnly = false,
  docsBrowseSeed?: DocsDriveBrowseSeed | null,
) {
  const [files, setFiles] = useState<GoogleDriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [nextPageToken, setNextPageToken] = useState<string | undefined>()
  const [loadingMore, setLoadingMore] = useState(false)
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>(() =>
    docsBrowseSeed ? [{ id: docsBrowseSeed.folderId, name: docsBrowseSeed.folderName }] : [],
  )
  const [uploading, setUploading] = useState<string | null>(null)
  const [source, setSource] = useState<DriveSource>(() => docsBrowseSeed?.source ?? 'my_drive')
  const [sharedDrives, setSharedDrives] = useState<{ id: string; name: string }[]>([])
  const [selectedDriveId, setSelectedDriveId] = useState<string | null>(() =>
    docsBrowseSeed?.source === 'shared_drives' ? (docsBrowseSeed.workspaceDriveId ?? null) : null,
  )
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [importedFileIds, setImportedFileIds] = useState<Set<string>>(new Set())
  const gridRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentFolderId =
    folderStack.length > 0 ? folderStack[folderStack.length - 1]!.id : undefined

  const loadFiles = useCallback(
    async (pageToken?: string) => {
      if (!pageToken) setLoading(true)
      else setLoadingMore(true)
      try {
        const result = await listDriveFiles({
          folderId: currentFolderId,
          query: search.trim() || undefined,
          pageSize: 50,
          pageToken,
          source,
          driveId: source === 'shared_drives' && selectedDriveId ? selectedDriveId : undefined,
        })
        const nextFiles = pickFoldersOnly
          ? result.files.filter((file) => file.mimeType === FOLDER_MIME)
          : result.files
        setFiles((prev) => (pageToken ? [...prev, ...nextFiles] : nextFiles))
        setNextPageToken(result.nextPageToken)
      } catch (error) {
        if (!pageToken) setFiles([])
        if (!pageToken) {
          const msg =
            error instanceof Error
              ? error.message
              : MEDIA_TOAST_ERRORS.DRIVE_LOAD_FAILED.userMessage
          void reportClientError({
            feature: 'ui/google_drive_browser',
            error_code: 'drive_list_failed',
            message: msg,
            context: { source, folderId: currentFolderId ?? null },
          })
          toast.error(msg)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [currentFolderId, pickFoldersOnly, search, source, selectedDriveId],
  )

  useEffect(() => {
    if (!open) return
    if (docsBrowseSeed) return
    setFiles([])
    setSearch('')
    setFolderStack([])
    setNextPageToken(undefined)
    setSource('my_drive')
    setSelectedDriveId(null)
    setSelectedFileIds(new Set())
    setImportedFileIds(new Set())
  }, [open, docsBrowseSeed])

  useEffect(() => {
    if (!open) return
    void loadFiles()
  }, [open, loadFiles])

  useEffect(() => {
    if (source === 'shared_drives' && sharedDrives.length === 0) {
      listSharedDrives()
        .then((r) => setSharedDrives(r.drives ?? []))
        .catch(() => {
          void reportClientError({
            feature: 'ui/google_drive_browser',
            error_code: 'shared_drives_list_failed',
            message: 'listSharedDrives failed',
          })
          setSharedDrives([])
        })
    }
  }, [source, sharedDrives.length])

  const navigateToFolder = useCallback((file: GoogleDriveFile) => {
    setFolderStack((prev) => [...prev, { id: file.id, name: file.name }])
    setSearch('')
  }, [])

  const navigateBack = useCallback(() => {
    setFolderStack((prev) => prev.slice(0, -1))
    setSearch('')
  }, [])

  const switchSource = useCallback((s: DriveSource) => {
    setSource(s)
    setFolderStack([])
    setSearch('')
    setSelectedDriveId(null)
    setSelectedFileIds(new Set())
  }, [])

  const handleScroll = useCallback(() => {
    if (!gridRef.current || loadingMore || !nextPageToken) return
    const el = gridRef.current
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) void loadFiles(nextPageToken)
  }, [loadingMore, nextPageToken, loadFiles])

  const handleUploadToDrive = useCallback(
    async (inputFile: File) => {
      setUploading(inputFile.name)
      try {
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
          reader.onerror = reject
          reader.readAsDataURL(inputFile)
        })
        const { backendPost } = await import('@/lib/api/backend-client')
        await backendPost('/api/integrations/google-drive/files/upload', {
          name: inputFile.name,
          mimeType: inputFile.type,
          content: base64,
          folderId: currentFolderId,
        })
        toast.success(MEDIA_TOAST_SUCCESS.UPLOADED.userMessage)
        void loadFiles()
      } catch {
        void reportClientError({
          feature: 'ui/google_drive_browser',
          error_code: 'drive_upload_failed',
          message: 'handleUploadToDrive failed',
        })
        toast.error(MEDIA_TOAST_ERRORS.UPLOAD_FAILED.userMessage)
      } finally {
        setUploading(null)
      }
    },
    [currentFolderId, loadFiles],
  )

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void handleUploadToDrive(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [handleUploadToDrive],
  )

  return {
    files,
    setFiles,
    loading,
    search,
    setSearch,
    nextPageToken,
    loadingMore,
    folderStack,
    setFolderStack,
    uploading,
    source,
    setSource,
    sharedDrives,
    selectedDriveId,
    setSelectedDriveId,
    selectedFileIds,
    setSelectedFileIds,
    importedFileIds,
    setImportedFileIds,
    currentFolderId,
    loadFiles,
    navigateToFolder,
    navigateBack,
    switchSource,
    handleUploadToDrive,
    gridRef,
    fileInputRef,
    handleScroll,
    handleFileInputChange,
  }
}
