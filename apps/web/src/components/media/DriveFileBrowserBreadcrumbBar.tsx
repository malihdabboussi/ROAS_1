'use client'

import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react'
import { ArrowLeft, Loader2, Search, Upload } from 'lucide-react'
import type { DriveSource } from '@/components/media/drive-file-browser-modal.types'

export function DriveFileBrowserBreadcrumbBar({
  source,
  sharedDrives,
  selectedDriveId,
  setSelectedDriveId,
  folderStack,
  setFolderStack,
  navigateBack,
  search,
  setSearch,
  uploading,
  fileInputRef,
  onFileInputChange,
  searchBarVariant = 'glass',
}: {
  source: DriveSource
  sharedDrives: { id: string; name: string }[]
  selectedDriveId: string | null
  setSelectedDriveId: (id: string | null) => void
  folderStack: { id: string; name: string }[]
  setFolderStack: Dispatch<SetStateAction<{ id: string; name: string }[]>>
  navigateBack: () => void
  search: string
  setSearch: (v: string) => void
  uploading: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void
  /** `surface` matches Train Brain Fathom search (border + surface-bg, compact height). */
  searchBarVariant?: 'glass' | 'surface'
}) {
  const showBack =
    folderStack.length > 0 || (source === 'shared_drives' && selectedDriveId !== null)

  const handleBack = () => {
    if (folderStack.length > 0) {
      navigateBack()
      return
    }
    if (source === 'shared_drives' && selectedDriveId !== null) {
      setSelectedDriveId(null)
      setFolderStack([])
      setSearch('')
    }
  }

  return (
    <div className="px-spacing-6 py-spacing-2 space-y-2">
      <div className="body-4 text-muted-foreground flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setFolderStack([])
            if (source === 'shared_drives') setSelectedDriveId(null)
          }}
          className="hover:text-foreground transition-colors"
        >
          {source === 'my_drive'
            ? 'My Drive'
            : source === 'shared_with_me'
              ? 'Shared'
              : (sharedDrives.find((d) => d.id === selectedDriveId)?.name ?? 'Drive')}
        </button>
        {folderStack.map((f, i) => (
          <span key={f.id} className="flex items-center gap-1">
            <span>/</span>
            <button
              type="button"
              onClick={() => setFolderStack((prev) => prev.slice(0, i + 1))}
              className="hover:text-foreground max-w-[120px] truncate transition-colors"
            >
              {f.name}
            </button>
          </span>
        ))}
      </div>
      <div className="gap-spacing-2 flex items-center">
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            className={
              searchBarVariant === 'surface'
                ? 'btn-icon-bare shrink-0'
                : 'btn-icon-glass rounded-spacing-2 shrink-0'
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="relative flex-1">
          {searchBarVariant === 'surface' ? (
            <>
              <Search className="icon-xs text-muted-foreground pointer-events-none absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="h-spacing-8 pl-spacing-6 pr-spacing-2 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
              />
            </>
          ) : (
            <>
              <Search className="icon-sm text-muted-foreground left-spacing-3 pointer-events-none absolute top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="h-spacing-10 rounded-spacing-2 pl-spacing-10 pr-spacing-3 input-glass body-3 placeholder:text-muted-foreground text-foreground w-full"
              />
            </>
          )}
        </div>
        {source === 'my_drive' && searchBarVariant !== 'surface' ? (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!uploading}
              className="chip-glass-neutral body-4 text-muted-foreground hover:text-foreground h-spacing-10 gap-spacing-1 rounded-spacing-2 px-spacing-3 flex shrink-0 items-center justify-center"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={onFileInputChange} />
          </>
        ) : null}
      </div>
    </div>
  )
}
