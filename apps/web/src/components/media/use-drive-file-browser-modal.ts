'use client'

import { useEffect, useMemo, useState } from 'react'
import { getDriveFileBrowserContextConfig } from '@/components/media/drive-file-browser-context-config'
import type {
  DriveFileBrowserModalProps,
  ViewMode,
} from '@/components/media/drive-file-browser-modal.types'
import { useDriveFileBrowserDialogs } from '@/components/media/use-drive-file-browser-dialogs'
import { useDriveFileBrowserFileOps } from '@/components/media/use-drive-file-browser-file-ops'
import { useDriveFileBrowserListing } from '@/components/media/use-drive-file-browser-listing'
import { useDriveFileBrowserSortTable } from '@/components/media/use-drive-file-browser-sort-table'

export function useDriveFileBrowserModal({
  open,
  onClose,
  campaignId,
  context = 'chat',
  pickFoldersOnly = false,
  onSelectFileForChat,
  onInsertDriveLink,
  keepOpenAfterImport = false,
  docsBrowseSeed,
}: DriveFileBrowserModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const listing = useDriveFileBrowserListing(open, pickFoldersOnly, docsBrowseSeed)

  useEffect(() => {
    if (!open) return
    if (!docsBrowseSeed) return
    setViewMode('gallery')
  }, [open, docsBrowseSeed?.folderId])

  useEffect(() => {
    if (!pickFoldersOnly) return
    setViewMode('table')
  }, [pickFoldersOnly])
  // Selection (checkbox column + per-row click) is enabled whenever a batch
  // action exists — either upload via `onSelectFileForChat` or link insertion
  // via `onInsertDriveLink`.
  const selectionEnabled = Boolean(onSelectFileForChat) || Boolean(onInsertDriveLink)
  const sortTable = useDriveFileBrowserSortTable(
    listing.files,
    listing.setSelectedFileIds,
    selectionEnabled,
  )
  const dialogs = useDriveFileBrowserDialogs()
  const contextConfig = useMemo(() => getDriveFileBrowserContextConfig(context), [context])
  const fileOps = useDriveFileBrowserFileOps(listing, sortTable, dialogs, {
    context,
    campaignId,
    onSelectFileForChat,
    onClose,
    keepOpenAfterImport,
  })

  return {
    viewMode,
    setViewMode,
    listing,
    sortTable,
    dialogs,
    contextConfig,
    fileOps,
    selectionEnabled,
  }
}
