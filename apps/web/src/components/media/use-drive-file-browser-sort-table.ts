'use client'

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  DRIVE_SELECT_COL_PX,
  DRIVE_TABLE_COL_DEFAULTS,
  DRIVE_TABLE_COL_MINS,
  DRIVE_TABLE_ORDER,
  FOLDER_MIME,
} from '@/components/media/drive-file-browser-modal.constants'
import type { DriveTableColKey } from '@/components/media/drive-file-browser-modal.types'
import { useProportionalColumnResize } from '@/components/media/file-browser-table-column-resize'
import type { GoogleDriveFile } from '@/lib/services/google-drive-api'

export function useDriveFileBrowserSortTable(
  files: GoogleDriveFile[],
  setSelectedFileIds: Dispatch<SetStateAction<Set<string>>>,
  selectionEnabled: boolean,
) {
  const [sortCol, setSortCol] = useState<'name' | 'size' | 'owner' | 'modified'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [driveTableColWidths, setDriveTableColWidths] =
    useState<Record<DriveTableColKey, number>>(DRIVE_TABLE_COL_DEFAULTS)
  const resizeDriveColumn = useProportionalColumnResize(DRIVE_TABLE_ORDER, DRIVE_TABLE_COL_MINS)

  const toggleSort = (col: 'name' | 'size' | 'owner' | 'modified') => {
    if (col === sortCol) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sortedFiles = useMemo(() => {
    const copy = [...files]
    const folders = copy.filter((f) => f.mimeType === FOLDER_MIME)
    const nonFolders = copy.filter((f) => f.mimeType !== FOLDER_MIME)
    const dir = sortDir === 'asc' ? 1 : -1

    const compare = (a: GoogleDriveFile, b: GoogleDriveFile) => {
      switch (sortCol) {
        case 'name':
          return dir * a.name.localeCompare(b.name)
        case 'size': {
          const sa = parseInt(a.size ?? '0', 10)
          const sb = parseInt(b.size ?? '0', 10)
          return dir * (sa - sb)
        }
        case 'owner': {
          const oa = a.owners?.[0]?.displayName ?? ''
          const ob = b.owners?.[0]?.displayName ?? ''
          return dir * oa.localeCompare(ob)
        }
        case 'modified': {
          const da = new Date(a.modifiedTime ?? 0).getTime()
          const db = new Date(b.modifiedTime ?? 0).getTime()
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
    () => sortedFiles.filter((f) => f.mimeType !== FOLDER_MIME),
    [sortedFiles],
  )

  const driveTableWidthTotalPx = useMemo(() => {
    const sel = selectionEnabled ? DRIVE_SELECT_COL_PX : 0
    return (
      sel +
      driveTableColWidths.name +
      driveTableColWidths.size +
      driveTableColWidths.owner +
      driveTableColWidths.modified +
      driveTableColWidths.actions
    )
  }, [selectionEnabled, driveTableColWidths])

  const driveColPct = useCallback(
    (px: number) => (driveTableWidthTotalPx > 0 ? `${(px / driveTableWidthTotalPx) * 100}%` : '0%'),
    [driveTableWidthTotalPx],
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
    driveTableColWidths,
    setDriveTableColWidths,
    resizeDriveColumn,
    driveColPct,
    toggleFileSelection,
    toggleSelectAll,
  }
}
