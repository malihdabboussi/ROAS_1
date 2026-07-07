'use client'

import { useMemo, useState } from 'react'
import { getDropboxFileBrowserContextConfig } from '@/components/media/dropbox-file-browser-context-config'
import type {
  DropboxFileBrowserModalProps,
  DropboxViewMode,
} from '@/components/media/dropbox-file-browser-modal.types'
import { useDropboxFileBrowserFileOps } from '@/components/media/use-dropbox-file-browser-file-ops'
import { useDropboxFileBrowserListing } from '@/components/media/use-dropbox-file-browser-listing'
import { useDropboxFileBrowserSortTable } from '@/components/media/use-dropbox-file-browser-sort-table'

export function useDropboxFileBrowserModal({
  open,
  onClose,
  campaignId,
  context = 'chat',
  onSelectFileForChat,
  keepOpenAfterImport = false,
}: DropboxFileBrowserModalProps) {
  const [viewMode, setViewMode] = useState<DropboxViewMode>('table')
  const listing = useDropboxFileBrowserListing(open)
  const selectionEnabled = Boolean(onSelectFileForChat)
  const sortTable = useDropboxFileBrowserSortTable(
    listing.files,
    listing.setSelectedFileIds,
    selectionEnabled,
  )
  const contextConfig = useMemo(() => getDropboxFileBrowserContextConfig(context), [context])
  const fileOps = useDropboxFileBrowserFileOps(listing, sortTable, {
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
    contextConfig,
    fileOps,
    selectionEnabled,
  }
}
