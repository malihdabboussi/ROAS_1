'use client'

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  DROPBOX_SELECT_COL_PX,
  DROPBOX_TABLE_COL_DEFAULTS,
  DROPBOX_TABLE_COL_MINS,
  DROPBOX_TABLE_ORDER,
} from '@/components/media/dropbox-file-browser-modal.constants'
import type { DropboxTableColKey } from '@/components/media/dropbox-file-browser-modal.types'
import { useProportionalColumnResize } from '@/components/media/file-browser-table-column-resize'
import type { DropboxFile } from '@/lib/services/dropbox-api'

export function useDropboxFileBrowserSortTable(
  files: DropboxFile[],
  setSelectedFileIds: Dispatch<SetStateAction<Set<string>>>,
  selectionEnabled: boolean,
) {
  const [sortCol, setSortCol] = useState<'name' | 'size' | 'modified'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [dropboxTableColWidths, setDropboxTableColWidths] =
    useState<Record<DropboxTableColKey, number>>(DROPBOX_TABLE_COL_DEFAULTS)
  const resizeDropboxColumn = useProportionalColumnResize(
    DROPBOX_TABLE_ORDER,
    DROPBOX_TABLE_COL_MINS,
  )

  const toggleSort = (col: 'name' | 'size' | 'modified') => {
    if (col === sortCol) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sortedFiles = useMemo(() => {
    const copy = [...files]
    const folders = copy.filter((f) => f['.tag'] === 'folder')
    const nonFolders = copy.filter((f) => f['.tag'] !== 'folder')
    const dir = sortDir === 'asc' ? 1 : -1

    const compare = (a: DropboxFile, b: DropboxFile) => {
      switch (sortCol) {
        case 'name':
          return dir * a.name.localeCompare(b.name)
        case 'size':
          return dir * ((a.size ?? 0) - (b.size ?? 0))
        case 'modified': {
          const da = new Date(a.server_modified ?? 0).getTime()
          const db = new Date(b.server_modified ?? 0).getTime()
          return dir * (da - db)
        }
        default:
          return 0
      }
    }

    folders.sort(compare)
    nonFolders.sort(compare)
    return [...folders, ...nonFolders]
  }, [files, sortCol, sortDir])

  const nonFolderFiles = useMemo(
    () => sortedFiles.filter((f) => f['.tag'] !== 'folder'),
    [sortedFiles],
  )

  const dropboxTableWidthTotalPx = useMemo(() => {
    const selectWidth = selectionEnabled ? DROPBOX_SELECT_COL_PX : 0
    return (
      selectWidth +
      dropboxTableColWidths.name +
      dropboxTableColWidths.size +
      dropboxTableColWidths.modified +
      dropboxTableColWidths.actions
    )
  }, [selectionEnabled, dropboxTableColWidths])

  const dropboxColPct = useCallback(
    (px: number) =>
      dropboxTableWidthTotalPx > 0 ? `${(px / dropboxTableWidthTotalPx) * 100}%` : '0%',
    [dropboxTableWidthTotalPx],
  )

  const toggleFileSelection = useCallback(
    (fileId: string) => {
      setSelectedFileIds((prev) => {
        const next = new Set(prev)
        if (next.has(fileId)) next.delete(fileId)
        else next.add(fileId)
        return next
      })
    },
    [setSelectedFileIds],
  )

  const toggleSelectAll = useCallback(() => {
    setSelectedFileIds((prev) => {
      if (prev.size === nonFolderFiles.length && nonFolderFiles.length > 0) return new Set()
      return new Set(nonFolderFiles.map((f) => f.id))
    })
  }, [nonFolderFiles, setSelectedFileIds])

  return {
    sortCol,
    sortDir,
    toggleSort,
    sortedFiles,
    nonFolderFiles,
    dropboxTableColWidths,
    setDropboxTableColWidths,
    resizeDropboxColumn,
    dropboxColPct,
    toggleFileSelection,
    toggleSelectAll,
  }
}
