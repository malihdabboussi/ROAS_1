'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { backendUpload } from '@/lib/api/backend-client'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import {
  copyAssetToCampaign,
  deleteAsset,
  updateAsset,
  type MediaAsset,
} from '@/lib/services/media-api'
import { deleteDocument, updateDocument } from '../../services/artifact-preview.service'
import type { ConversationDocument } from '../../types'
import {
  MediaTabHeader,
  MediaTabShell,
  useMediaTabBulkSelection,
  useMediaTabData,
  VIEW_MODE_STORAGE_KEY,
} from './media'
import type { MediaGridTab, MediaTabProps, MediaViewMode, Selection } from './media'

export function MediaTab({ campaignId, mobilePreviewMode }: MediaTabProps) {
  const [selection, setSelection] = useState<Selection>(null)
  const [docsExpanded, setDocsExpanded] = useState<Set<string>>(new Set())
  const [imagesExpanded, setImagesExpanded] = useState(false)
  const [videosExpanded, setVideosExpanded] = useState(false)
  const [docsCollapsed, setDocsCollapsed] = useState(false)
  const [imagesCollapsed, setImagesCollapsed] = useState(false)
  const [videosCollapsed, setVideosCollapsed] = useState(false)
  const [filesCollapsed, setFilesCollapsed] = useState(false)
  const [filesExpanded, setFilesExpanded] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { upload: presignedUpload } = usePresignedUpload()
  const menuBtnRef = useRef<HTMLButtonElement | null>(null)
  const dropCounterRef = useRef(0)

  const [viewMode, setViewMode] = useState<MediaViewMode>(() => {
    if (typeof window === 'undefined') return 'list'
    return (localStorage.getItem(VIEW_MODE_STORAGE_KEY) as MediaViewMode) || 'list'
  })
  const [activeGridTab, setActiveGridTab] = useState<MediaGridTab>('documents')
  const [searchQuery, setSearchQuery] = useState('')
  const {
    nonImageDocs,
    groupedDocs,
    images,
    videos,
    audios,
    fileAssets,
    filteredDeliverables,
    filteredLinkRows,
    loading,
    docsError,
    assetsError,
    deliverablesError,
    setDocs,
    setAssets,
    loadDocs,
    loadAssets,
  } = useMediaTabData({ campaignId, searchQuery })
  const {
    bulkSelectMode,
    bulkSelectedCount,
    bulkSelectedIds,
    toggleBulkSelectMode,
    toggleBulkSelectItem,
    showBulkDeleteModal,
    setShowBulkDeleteModal,
    isBulkDeleting,
    bulkDeleteError,
    handleConfirmBulkDelete,
  } = useMediaTabBulkSelection({
    selection,
    setSelection,
    loadAssets,
    loadDocs,
  })

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next: MediaViewMode = prev === 'list' ? 'grid' : 'list'
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, next)
      return next
    })
  }, [])

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const prevSelectionRef = useRef(selection)
  useEffect(() => {
    if (!isMobile || !selection || selection === prevSelectionRef.current) {
      prevSelectionRef.current = selection
      return
    }
    prevSelectionRef.current = selection
    const name =
      selection.type === 'document'
        ? (selection.doc.title ?? 'Document')
        : selection.type === 'deliverable'
          ? (selection.deliverable.title ?? 'Deliverable')
          : (selection.asset.source_prompt ?? selection.asset.name ?? 'Media')
    window.dispatchEvent(
      new CustomEvent('mobile-artifact-preview', { detail: { name, hasSettings: false } }),
    )
  }, [isMobile, selection])

  useEffect(() => {
    if (!isMobile) return
    const handler = () => setSelection(null)
    window.addEventListener('mobile-artifact-back', handler)
    return () => window.removeEventListener('mobile-artifact-back', handler)
  }, [isMobile])

  const handleDeleteAsset = useCallback(
    async (asset: MediaAsset) => {
      try {
        await deleteAsset(asset.id)
        setAssets((prev) => prev.filter((a) => a.id !== asset.id))
        if (
          selection &&
          selection.type !== 'document' &&
          selection.type !== 'deliverable' &&
          selection.asset.id === asset.id
        )
          setSelection(null)
      } finally {
        setMenuOpenId(null)
      }
    },
    [selection],
  )

  const handleRenameAsset = useCallback((asset: MediaAsset) => {
    setEditingId(`asset-${asset.id}`)
    setMenuOpenId(null)
  }, [])

  const handleConfirmRenameAsset = useCallback(
    async (assetId: string, name: string) => {
      try {
        const updated = await updateAsset(assetId, { name })
        setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, name: updated.name } : a)))
        if (
          selection &&
          selection.type !== 'document' &&
          selection.type !== 'deliverable' &&
          selection.asset.id === assetId
        ) {
          setSelection({
            ...selection,
            asset: { ...selection.asset, name: updated.name },
          } as Selection)
        }
      } finally {
        setEditingId(null)
      }
    },
    [selection],
  )

  const handleDeleteDoc = useCallback(
    async (doc: ConversationDocument) => {
      try {
        await deleteDocument(doc.id)
        setDocs((prev) => prev.filter((d) => d.id !== doc.id))
        if (selection?.type === 'document' && selection.doc.id === doc.id) setSelection(null)
      } finally {
        setMenuOpenId(null)
      }
    },
    [selection],
  )

  const handleRenameDoc = useCallback((doc: ConversationDocument) => {
    setEditingId(`doc-${doc.id}`)
    setMenuOpenId(null)
  }, [])

  const handleConfirmRenameDoc = useCallback(
    async (docId: string, title: string) => {
      try {
        const updated = await updateDocument(docId, title)
        setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, title: updated.title } : d)))
        if (selection?.type === 'document' && selection.doc.id === docId) {
          setSelection({ ...selection, doc: { ...selection.doc, title: updated.title } })
        }
      } finally {
        setEditingId(null)
      }
    },
    [selection],
  )

  const handleDropUpload = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return
      setUploading(true)
      try {
        for (const file of [...files]) {
          if (file.size >= 5 * 1024 * 1024) {
            await presignedUpload({
              file,
              name: file.name,
              campaign_id: campaignId,
              category: 'upload',
            })
          } else {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('name', file.name)
            formData.append('campaign_id', campaignId)
            formData.append('category', 'upload')
            await backendUpload<{ success?: boolean }>('/api/media/upload', formData)
          }
        }
        void loadAssets()
      } catch {
        toast.error("Couldn't upload. Try again.")
      } finally {
        setUploading(false)
      }
    },
    [campaignId, loadAssets, presignedUpload],
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dropCounterRef.current += 1
    if (e.dataTransfer.types.includes('Files')) setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dropCounterRef.current -= 1
    if (dropCounterRef.current === 0) setDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dropCounterRef.current = 0
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) void handleDropUpload(e.dataTransfer.files)
    },
    [handleDropUpload],
  )

  const headerBar = (
    <MediaTabHeader
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      bulkSelectMode={bulkSelectMode}
      onToggleBulkSelectMode={toggleBulkSelectMode}
      onOpenPicker={() => setPickerOpen(true)}
      isMobile={isMobile}
      viewMode={viewMode}
      onToggleViewMode={toggleViewMode}
    />
  )

  const pickerModal = (
    <MediaPickerModal
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      campaignId={campaignId}
      multiSelect
      onSelect={() => {}}
      onSelectAssets={(selected) => {
        const needsCopy = selected.filter((a) => a.campaign_id !== campaignId)
        if (needsCopy.length > 0) {
          void Promise.all(needsCopy.map((a) => copyAssetToCampaign(a.id, campaignId))).then(() =>
            loadAssets(),
          )
        } else {
          void loadAssets()
        }
      }}
    />
  )

  return (
    <MediaTabShell
      campaignId={campaignId}
      mobilePreviewMode={mobilePreviewMode}
      isMobile={isMobile}
      selection={selection}
      setSelection={setSelection}
      headerBar={headerBar}
      pickerModal={pickerModal}
      loading={loading}
      viewMode={viewMode}
      activeGridTab={activeGridTab}
      setActiveGridTab={setActiveGridTab}
      nonImageDocs={nonImageDocs}
      groupedDocs={groupedDocs}
      images={images}
      videos={videos}
      audios={audios}
      fileAssets={fileAssets}
      filteredDeliverables={filteredDeliverables}
      filteredLinkRows={filteredLinkRows}
      docsError={docsError}
      assetsError={assetsError}
      deliverablesError={deliverablesError}
      docsCollapsed={docsCollapsed}
      setDocsCollapsed={setDocsCollapsed}
      imagesCollapsed={imagesCollapsed}
      setImagesCollapsed={setImagesCollapsed}
      videosCollapsed={videosCollapsed}
      setVideosCollapsed={setVideosCollapsed}
      filesCollapsed={filesCollapsed}
      setFilesCollapsed={setFilesCollapsed}
      docsExpanded={docsExpanded}
      setDocsExpanded={setDocsExpanded}
      imagesExpanded={imagesExpanded}
      setImagesExpanded={setImagesExpanded}
      videosExpanded={videosExpanded}
      setVideosExpanded={setVideosExpanded}
      filesExpanded={filesExpanded}
      setFilesExpanded={setFilesExpanded}
      menuOpenId={menuOpenId}
      setMenuOpenId={setMenuOpenId}
      editingId={editingId}
      setEditingId={setEditingId}
      menuBtnRef={menuBtnRef}
      handleRenameDoc={handleRenameDoc}
      handleDeleteDoc={handleDeleteDoc}
      handleConfirmRenameDoc={handleConfirmRenameDoc}
      handleRenameAsset={handleRenameAsset}
      handleDeleteAsset={handleDeleteAsset}
      handleConfirmRenameAsset={handleConfirmRenameAsset}
      bulkSelectMode={bulkSelectMode}
      bulkSelectedCount={bulkSelectMode ? bulkSelectedCount : 0}
      bulkSelectedIds={bulkSelectedIds}
      onToggleBulkSelectItem={toggleBulkSelectItem}
      onOpenBulkDeleteModal={() => setShowBulkDeleteModal(true)}
      showBulkDeleteModal={showBulkDeleteModal}
      onCloseBulkDeleteModal={() => setShowBulkDeleteModal(false)}
      onConfirmBulkDelete={handleConfirmBulkDelete}
      isBulkDeleting={isBulkDeleting}
      bulkDeleteError={bulkDeleteError}
      dragOver={dragOver}
      uploading={uploading}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  )
}
