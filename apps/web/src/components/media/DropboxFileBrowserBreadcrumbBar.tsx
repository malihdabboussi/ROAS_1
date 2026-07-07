'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import { ArrowLeft, Grid3X3, Loader2, Search, Table2, Upload } from 'lucide-react'
import type { DropboxViewMode } from '@/components/media/dropbox-file-browser-modal.types'

export function DropboxFileBrowserBreadcrumbBar({
  embedded,
  folderStack,
  setFolderStack,
  navigateBack,
  search,
  setSearch,
  viewMode,
  setViewMode,
  uploading,
  fileInputRef,
  onFileInputChange,
}: {
  embedded: boolean
  folderStack: { path: string; name: string }[]
  setFolderStack: Dispatch<SetStateAction<{ path: string; name: string }[]>>
  navigateBack: () => void
  search: string
  setSearch: (value: string) => void
  viewMode: DropboxViewMode
  setViewMode: (mode: DropboxViewMode) => void
  uploading: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="px-spacing-6 py-spacing-2 space-y-2">
      {folderStack.length > 0 && (
        <div className="body-4 text-muted-foreground flex items-center gap-1">
          {folderStack.map((f, i) => (
            <span key={f.path} className="flex items-center gap-1">
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
      )}
      <div className="gap-spacing-2 flex items-center">
        {folderStack.length > 0 && (
          <button
            type="button"
            onClick={navigateBack}
            className={
              embedded ? 'btn-icon-bare shrink-0' : 'btn-icon-glass rounded-spacing-2 shrink-0'
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="relative flex-1">
          {embedded ? (
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
        <div
          className={
            embedded
              ? 'chip-glass-neutral h-spacing-8 rounded-spacing-2 flex shrink-0 items-center gap-0.5 p-0.5'
              : 'chip-glass-neutral h-spacing-10 rounded-spacing-2 flex shrink-0 items-center gap-0.5 p-0.5'
          }
        >
          {[
            { key: 'table' as const, icon: Table2, label: 'Table' },
            { key: 'gallery' as const, icon: Grid3X3, label: 'Gallery' },
          ].map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setViewMode(v.key)}
              title={`${v.label} view`}
              className={`rounded-spacing-1 p-1.5 transition-colors ${viewMode === v.key ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <v.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        {!embedded ? (
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
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFileInputChange}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
