'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { MEDIA_TOAST_ERRORS, MEDIA_TOAST_SUCCESS } from '@/lib/config/media-toast-errors.config'
import {
  listDropboxFiles,
  searchDropboxFiles,
  type DropboxFile,
} from '@/lib/services/dropbox-api'

export function useDropboxFileBrowserListing(open: boolean) {
  const [files, setFiles] = useState<DropboxFile[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [folderStack, setFolderStack] = useState<{ path: string; name: string }[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [importedFileIds, setImportedFileIds] = useState<Set<string>>(new Set())
  const gridRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const currentPath = folderStack.length > 0 ? folderStack[folderStack.length - 1]!.path : ''

  const loadFiles = useCallback(
    async (nextCursor?: string) => {
      if (!nextCursor) setLoading(true)
      else setLoadingMore(true)
      try {
        const result = await listDropboxFiles({
          path: currentPath,
          cursor: nextCursor,
          limit: 50,
        })
        setFiles((prev) => (nextCursor ? [...prev, ...result.entries] : result.entries))
        setCursor(result.cursor)
        setHasMore(result.has_more)
      } catch {
        if (!nextCursor) setFiles([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [currentPath],
  )

  const doSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        void loadFiles()
        return
      }
      setLoading(true)
      try {
        const result = await searchDropboxFiles(query.trim(), currentPath || undefined)
        setFiles(result.matches)
        setCursor(undefined)
        setHasMore(false)
      } catch {
        setFiles([])
      } finally {
        setLoading(false)
      }
    },
    [currentPath, loadFiles],
  )

  useEffect(() => {
    if (!open) return
    setFiles([])
    setSearch('')
    setFolderStack([])
    setCursor(undefined)
    setHasMore(false)
    setSelectedFileIds(new Set())
    setImportedFileIds(new Set())
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!search.trim()) void loadFiles()
  }, [currentPath, open])

  useEffect(() => {
    if (!open) return
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      void doSearch(search)
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [search])

  const navigateToFolder = useCallback((file: DropboxFile) => {
    setFolderStack((prev) => [...prev, { path: file.path_lower, name: file.name }])
    setSearch('')
  }, [])

  const navigateBack = useCallback(() => {
    setFolderStack((prev) => prev.slice(0, -1))
    setSearch('')
  }, [])

  const handleScroll = useCallback(() => {
    if (!gridRef.current || loadingMore || !hasMore || !cursor) return
    const el = gridRef.current
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) void loadFiles(cursor)
  }, [loadingMore, hasMore, cursor, loadFiles])

  const handleUploadToDropbox = useCallback(
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
        const uploadPath = currentPath ? `${currentPath}/${inputFile.name}` : `/${inputFile.name}`
        await backendPost('/api/integrations/dropbox/files/upload', {
          path: uploadPath,
          content: base64,
          mode: 'add',
        })
        toast.success(MEDIA_TOAST_SUCCESS.UPLOADED.userMessage)
        void loadFiles()
      } catch {
        toast.error(MEDIA_TOAST_ERRORS.UPLOAD_FAILED.userMessage)
      } finally {
        setUploading(null)
      }
    },
    [currentPath, loadFiles],
  )

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void handleUploadToDropbox(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [handleUploadToDropbox],
  )

  return {
    files,
    setFiles,
    loading,
    search,
    setSearch,
    cursor,
    hasMore,
    loadingMore,
    folderStack,
    setFolderStack,
    uploading,
    selectedFileIds,
    setSelectedFileIds,
    importedFileIds,
    setImportedFileIds,
    currentPath,
    loadFiles,
    navigateToFolder,
    navigateBack,
    handleScroll,
    handleUploadToDropbox,
    gridRef,
    fileInputRef,
    handleFileInputChange,
  }
}
